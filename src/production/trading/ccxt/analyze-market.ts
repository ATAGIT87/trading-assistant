import ccxt from "ccxt";
import { ATR, EMA, RSI } from "technicalindicators";

const EMA_PERIOD = 50;
const RSI_PERIOD = 14;
const OVERSOLD = 35;
const CANDLE_LIMIT = 200;

interface OhlcvExchange {
  has: Record<string, unknown>;
  timeframes?: Record<string, unknown>;
  loadMarkets(): Promise<unknown>;
  market(symbol: string): { spot?: boolean; active?: boolean };
  parseTimeframe(timeframe: string): number;
  fetchOHLCV(
    symbol: string,
    timeframe: string,
    since?: number,
    limit?: number,
  ): Promise<unknown>;
}
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface MarketAnalysis {
  symbol: string;
  timeframe: string;
  shouldBuy: boolean;
  reason: string;
  candle?: Candle;
  ema50?: number;
  rsi14?: number;
  previousRsi14?: number;
  beforePreviousRsi14?: number;
  closedCandles?: number;
  currentPrice?: number;
  closedHistory?: Candle[];
  atr14?: number;
}

/** A local upward turn after an observed entry into the <35 oversold episode.
 * The hook need not cross above 35; an already-rising RSI is not a new hook.
 */
export function hasOversoldHook(rsis: number[]): boolean {
  if (
    rsis.length < 3 ||
    rsis.some((r) => !Number.isFinite(r) || r < 0 || r > 100)
  )
    return false;
  const last = rsis.length - 1;
  if (!(
    rsis[last - 1] < OVERSOLD &&
    rsis[last] > rsis[last - 1] &&
    rsis[last - 1] <= rsis[last - 2]
  ))
    return false;
  // Require an actual observed crossing below 35, not just a truncated history
  // that started oversold. Only the episode containing the preceding bar counts.
  let start = last - 1;
  while (start > 0 && rsis[start - 1] < OVERSOLD) start--;
  return start > 0 && rsis[start - 1] >= OVERSOLD;
}

/** Strict CCXT mapping: [timestamp(ms), open, high, low, close, volume]. */
export function mapClosedOhlcv(
  raw: unknown,
  durationMs: number,
  now: number,
): Candle[] {
  if (
    !Array.isArray(raw) ||
    !Number.isSafeInteger(durationMs) ||
    durationMs <= 0 ||
    !Number.isFinite(now)
  )
    throw new Error("INVALID_OHLCV");
  const bars: Candle[] = [];
  for (const row of raw) {
    if (
      !Array.isArray(row) ||
      !Number.isSafeInteger(row[0]) ||
      row[0] <= 0 ||
      row[0] > now
    )
      throw new Error("INVALID_OHLCV");
    const timestamp: number = row[0];
    // A forming bar may have incomplete OHLC fields; never feed it to indicators.
    if (timestamp + durationMs > now) continue;
    const [, open, high, low, close, volume] = row;
    if (
      ![open, high, low, close, volume].every(
        (v) => typeof v === "number" && Number.isFinite(v),
      ) ||
      Math.min(open, high, low, close) <= 0 ||
      volume < 0 ||
      high < Math.max(open, close) ||
      low > Math.min(open, close) ||
      high < low
    )
      throw new Error("INVALID_OHLCV");
    bars.push({ timestamp, open, high, low, close, volume });
  }
  const sorted = bars
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-CANDLE_LIMIT);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp - sorted[i - 1].timestamp !== durationMs)
      throw new Error("NON_CONTINUOUS_OHLCV");
  }
  return sorted;
}

export const EMA_RSI_STRATEGY_VERSION = "ccxt-ema50-rsi14-v1";

/** Single decision implementation shared by CCXT, stored-data replay and backtests.
 * The forming price is carried as display metadata only.
 */
export function evaluateClosedMarket(
  symbol: string,
  timeframe: string,
  history: Candle[],
  durationMs: number,
  evaluatedAt: number,
  currentPrice?: number,
): MarketAnalysis {
  const no = (reason: string): MarketAnalysis => ({
    symbol,
    timeframe,
    shouldBuy: false,
    reason,
  });
  try {
    const candles = mapClosedOhlcv(
      history
        .slice(-(CANDLE_LIMIT - 1))
        .map((c) => [c.timestamp, c.open, c.high, c.low, c.close, c.volume]),
      durationMs,
      evaluatedAt,
    );
    if (candles.length < Math.max(EMA_PERIOD, RSI_PERIOD + 3))
      return no("INSUFFICIENT_CLOSED_CANDLES");
    const candle = candles.at(-1)!;
    if (evaluatedAt - candle.timestamp >= 2 * durationMs)
      return no("STALE_CLOSED_CANDLE");
    // Numeric arrays, chronological oldest -> newest. Never pass OHLCV tuples
    // or high/low/open arrays to EMA/RSI; both use closing prices.
    const closes = candles.map((c) => c.close);
    const stage = "INVALID_INDICATOR_OUTPUT";
    const emas = EMA.calculate({
      period: EMA_PERIOD,
      values: [...closes],
      reversedInput: false,
    });
    const rsis = RSI.calculate({
      period: RSI_PERIOD,
      values: [...closes],
      reversedInput: false,
    });
    if (
      emas.length !== closes.length - EMA_PERIOD + 1 ||
      rsis.length !== closes.length - RSI_PERIOD ||
      emas.some((v) => !Number.isFinite(v) || v <= 0) ||
      rsis.some((v) => !Number.isFinite(v) || v < 0 || v > 100)
    )
      return no(stage);
    // Outputs omit warmup, so align by their LAST element, not candle indices.
    const ema50 = emas.at(-1)!,
      rsi14 = rsis.at(-1)!,
      previousRsi14 = rsis.at(-2)!,
      beforePreviousRsi14 = rsis.at(-3)!;
    const atr14 = ATR.calculate({
      period: 14,
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: closes,
    }).at(-1);
    if (atr14 === undefined || !Number.isFinite(atr14) || atr14 <= 0)
      return no("INVALID_INDICATOR_OUTPUT");
    const bullish = candle.close > ema50;
    const hook = hasOversoldHook(rsis);
    return {
      symbol,
      timeframe,
      shouldBuy: bullish && hook,
      reason: !bullish
        ? "PRICE_NOT_ABOVE_EMA50"
        : hook
          ? "BULLISH_OVERSOLD_HOOK"
          : "NO_NEW_OVERSOLD_HOOK",
      candle,
      ema50,
      rsi14,
      previousRsi14,
      beforePreviousRsi14,
      closedCandles: candles.length,
      currentPrice,
      closedHistory: candles,
      atr14,
    };
  } catch (error) {
    return no(
      error instanceof Error &&
        ["INVALID_OHLCV", "NON_CONTINUOUS_OHLCV"].includes(error.message)
        ? error.message
        : "INVALID_INDICATOR_OUTPUT",
    );
  }
}

/** Injectable exchange/clock for deterministic tests; the exported analyzer uses Kraken. */
export function createMarketAnalyzer(
  exchange: OhlcvExchange,
  now: () => number = Date.now,
) {
  return async function analyzeMarket(
    symbol: string,
    timeframe: string,
  ): Promise<MarketAnalysis> {
    const no = (reason: string): MarketAnalysis => ({
      symbol,
      timeframe,
      shouldBuy: false,
      reason,
    });
    if (
      typeof symbol !== "string" ||
      typeof timeframe !== "string" ||
      !symbol.trim() ||
      !timeframe.trim()
    )
      return no("INVALID_ARGUMENTS");
    let stage = "FETCH_FAILED";
    try {
      await exchange.loadMarkets();
      if (!exchange.has.fetchOHLCV) return no("OHLCV_UNSUPPORTED");
      if (
        !exchange.timeframes ||
        !Object.hasOwn(exchange.timeframes, timeframe)
      )
        return no("UNSUPPORTED_TIMEFRAME");
      const market = exchange.market(symbol); // Unified CCXT symbols, e.g. BTC/EUR.
      if (!market?.spot || market.active === false)
        return no("UNSUPPORTED_SPOT_MARKET");
      const durationMs = exchange.parseTimeframe(timeframe) * 1000;
      if (
        !Number.isSafeInteger(durationMs) ||
        durationMs <= 0 ||
        timeframe.endsWith("M")
      )
        return no("UNSUPPORTED_TIMEFRAME");
      const raw = await exchange.fetchOHLCV(
        symbol,
        timeframe,
        undefined,
        CANDLE_LIMIT,
      );
      const evaluatedAt = now();
      stage = "INVALID_OHLCV";
      const candles = mapClosedOhlcv(raw, durationMs, evaluatedAt);
      // EMA50 needs 50 prices; three RSI14 outputs need 17 prices.
      if (candles.length < Math.max(EMA_PERIOD, RSI_PERIOD + 3))
        return no("INSUFFICIENT_CLOSED_CANDLES");
      // Do not assume the final row is forming: Kraken can return a cached
      // closed-only response. Require the current bucket before evaluating -2.
      const rows = (raw as unknown[][])
        .slice()
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      const forming = rows.at(-1)!;
      if (
        Number(forming[0]) !==
        Math.floor(evaluatedAt / durationMs) * durationMs
      )
        return no("FORMING_CANDLE_UNAVAILABLE");
      const closedIndex = rows.length - 2;
      const candle = candles.at(-1)!;
      if (closedIndex < 0 || rows[closedIndex][0] !== candle.timestamp)
        return no("INVALID_CLOSED_CANDLE_INDEX");
      const currentPrice =
        typeof forming[4] === "number" &&
        Number.isFinite(forming[4]) &&
        forming[4] > 0
          ? forming[4]
          : undefined;
      if (evaluatedAt - candle.timestamp >= 2 * durationMs)
        return no("STALE_CLOSED_CANDLE");
      return evaluateClosedMarket(
        symbol,
        timeframe,
        candles,
        durationMs,
        evaluatedAt,
        currentPrice,
      );
    } catch (error) {
      // Do not expose credential-bearing request URLs or raw exchange exceptions.
      if (
        error instanceof Error &&
        ["INVALID_OHLCV", "NON_CONTINUOUS_OHLCV"].includes(error.message)
      )
        return no(error.message);
      return no(stage);
    }
  };
}

// Reuse one instance: CCXT's rate limiter and market cache belong to the exchange.
const kraken = new ccxt.kraken({ enableRateLimit: true, timeout: 15000 });
/** Evaluates ONLY the newest fully closed candle; no orders or alerts are sent here. */
const runAnalysis = createMarketAnalyzer(kraken);
export async function analyzeMarket(
  symbol: string,
  timeframe: string,
): Promise<MarketAnalysis> {
  return runAnalysis(symbol, timeframe);
}
