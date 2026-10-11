import ccxt from "ccxt";
import { ATR, EMA } from "technicalindicators";

const CANDLE_LIMIT = 720;
export const SPOT_STRATEGY_VERSION = "spot-4h-pullback-daily-ema200-basket-v4";
/** Compatibility for already-accepted Daily-macro orders; no old entry implementation. */
export const LEGACY_DAILY_SPOT_STRATEGY_VERSION =
  "spot-4h-pullback-daily-ema200-basket-v3";
export const FOUR_HOURS_MS = 14_400_000;
export const ONE_HOUR_MS = 3_600_000;
export const DAILY_MS = 86_400_000;

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
  ema20?: number;
  ema50?: number;
  ema200?: number;
  atr14?: number;
  pullbackTo20?: boolean;
  pullbackTo50?: boolean;
  closedCandles?: number;
  currentPrice?: number;
  macroCandle?: Candle;
  macroBullish?: boolean;
  closedHistory?: Candle[];
}

/** Strict mapping, no fabricated candles, forming bars excluded before indicators. */
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
      row[0] > now ||
      row[0] % durationMs !== 0
    )
      throw new Error("INVALID_OHLCV");
    const [timestamp, open, high, low, close, volume] = row;
    if (timestamp + durationMs > now) continue;
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
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].timestamp - sorted[i - 1].timestamp !== durationMs)
      throw new Error("NON_CONTINUOUS_OHLCV");
  return sorted;
}

/** Completed macro data only; callers can revalidate an order at the start of its fill bar. */
export function evaluateMacroTrend(
  history: Candle[],
  evaluatedAt: number,
  durationMs = DAILY_MS,
) {
  try {
    const macroBars = mapClosedOhlcv(
      history
        .filter((c) => c.timestamp + durationMs <= evaluatedAt)
        .slice(-719)
        .map((c) => [c.timestamp, c.open, c.high, c.low, c.close, c.volume]),
      durationMs,
      evaluatedAt,
    );
    if (macroBars.length < 200)
      return { reason: "INSUFFICIENT_CLOSED_DAILY_MACRO_HISTORY" };
    const macroCandle = macroBars.at(-1)!;
    if (evaluatedAt - macroCandle.timestamp >= 2 * durationMs)
      return { reason: "STALE_DAILY_MACRO_HISTORY" };
    const ema200 = EMA.calculate({
      period: 200,
      values: macroBars.map((c) => c.close),
    }).at(-1)!;
    if (!Number.isFinite(ema200) || ema200 <= 0)
      return { reason: "INVALID_INDICATOR_OUTPUT" };
    return { ema200, macroCandle, macroBullish: macroCandle.close > ema200 };
  } catch (error) {
    return {
      reason:
        error instanceof Error &&
        ["INVALID_OHLCV", "NON_CONTINUOUS_OHLCV"].includes(error.message)
          ? error.message
          : "INVALID_MACRO_HISTORY",
    };
  }
}

/** Closed-4h pullback, gated by completed Daily EMA200 macro trend. */
export function evaluateClosedMarket(
  symbol: string,
  timeframe: string,
  history: Candle[],
  durationMs: number,
  evaluatedAt: number,
  currentPrice?: number,
  macroHistory: Candle[] = [],
): MarketAnalysis {
  const no = (reason: string): MarketAnalysis => ({
    symbol,
    timeframe,
    shouldBuy: false,
    reason,
  });
  if (timeframe !== "4h" || durationMs !== FOUR_HOURS_MS)
    return no("UNSUPPORTED_TIMEFRAME");
  try {
    const candles = mapClosedOhlcv(
      history
        .slice(-719)
        .map((c) => [c.timestamp, c.open, c.high, c.low, c.close, c.volume]),
      durationMs,
      evaluatedAt,
    );
    if (candles.length < 50) return no("INSUFFICIENT_CLOSED_CANDLES");
    const candle = candles.at(-1)!;
    if (evaluatedAt - candle.timestamp >= 2 * durationMs)
      return no("STALE_CLOSED_CANDLE");
    const closes = candles.map((c) => c.close);
    const ema20 = EMA.calculate({ period: 20, values: closes }).at(-1)!;
    const ema50 = EMA.calculate({ period: 50, values: closes }).at(-1)!;
    const macroSnapshot = evaluateMacroTrend(macroHistory, evaluatedAt);
    if (macroSnapshot.reason) return no(macroSnapshot.reason);
    const { ema200, macroCandle, macroBullish } = macroSnapshot;
    const atr14 = ATR.calculate({
      period: 14,
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: closes,
    }).at(-1)!;
    if (
      ![ema20, ema50, ema200!, atr14].every((v) => Number.isFinite(v) && v > 0)
    )
      return no("INVALID_INDICATOR_OUTPUT");
    const bullishCandle = candle.close > candle.open;
    const pullbackTo20 =
      candle.low <= ema20 && candle.close > ema20 && bullishCandle;
    const pullbackTo50 =
      candle.low <= ema50 && candle.close > ema50 && bullishCandle;
    const macro = macroBullish === true && candle.close > ema200!,
      shouldBuy = macro && (pullbackTo20 || pullbackTo50);
    return {
      symbol,
      timeframe,
      shouldBuy,
      reason: !macroBullish
        ? "DAILY_MACRO_NOT_BULLISH"
        : !macro
          ? "PRICE_NOT_ABOVE_DAILY_EMA200"
          : shouldBuy
            ? "BULLISH_DAILY_MACRO_WITH_4H_PULLBACK"
            : "NO_BULLISH_4H_PULLBACK",
      candle,
      ema20,
      ema50,
      ema200,
      atr14,
      pullbackTo20,
      pullbackTo50,
      closedCandles: candles.length,
      closedHistory: candles,
      currentPrice,
      macroCandle,
      macroBullish,
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
        timeframe !== "4h" ||
        !Object.hasOwn(exchange.timeframes, timeframe) ||
        !Object.hasOwn(exchange.timeframes, "1d")
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
      const [raw, macroRaw] = await Promise.all([
        exchange.fetchOHLCV(symbol, timeframe, undefined, CANDLE_LIMIT),
        exchange.fetchOHLCV(symbol, "1d", undefined, CANDLE_LIMIT),
      ]);
      const evaluatedAt = now();
      stage = "INVALID_OHLCV";
      const candles = mapClosedOhlcv(raw, durationMs, evaluatedAt);
      const macroCandles = mapClosedOhlcv(macroRaw, DAILY_MS, evaluatedAt);
      // 4h EMA50 needs 50 prices; the macro series needs 200 closed daily bars.
      if (candles.length < 50) return no("INSUFFICIENT_CLOSED_CANDLES");
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
        macroCandles,
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
