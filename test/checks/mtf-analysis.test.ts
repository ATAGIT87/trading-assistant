import "reflect-metadata";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  createMarketAnalyzer,
  evaluateClosedMarket,
  evaluateMacroTrend,
  FOUR_HOURS_MS as F,
  DAILY_MS as D,
  SPOT_STRATEGY_VERSION,
  Candle,
} from "../../src/production/trading/ccxt/analyze-market";
import { RiskManagerService } from "../../src/production/risk/risk-manager.service";
import { EmaRsiSpotStrategy } from "../../src/production/trading/ema-rsi-spot.strategy";
import {
  rebaseSignalAtEntry,
  hasPositiveNetTarget,
} from "../../src/production/trading/trade-execution";
import { EmaRsiReplayStrategy } from "../research/strategies/ema-rsi-replay.strategy";
import { MarketCandle } from "../../src/production/market-data/entities/market-candle.entity";
import {
  supportedTradingSymbols,
  normalizeTradingSymbol,
  rankEurMarkets,
  refreshTradingWatchlist,
  watchlistStatus,
} from "../../src/production/market-data/trading-symbol";
const start = Date.parse("2025-01-01"),
  at = start + 200 * F + 10000;
function history(): Candle[] {
  return Array.from({ length: 200 }, (_, i) => ({
    timestamp: start + i * F,
    open: 100 + i * 0.25 - 0.1,
    high: 101 + i * 0.25,
    low: 100 + i * 0.25 - 0.1,
    close: 100 + i * 0.25,
    volume: 10,
  }));
}
function macro(): Candle[] {
  const end = Math.floor(at / D) * D;
  return Array.from({ length: 200 }, (_, i) => ({
    timestamp: end - (200 - i) * D,
    open: 80 + i * 0.1 - 0.1,
    high: 81 + i * 0.1,
    low: 79 + i * 0.1,
    close: 80 + i * 0.1,
    volume: 10,
  }));
}
function setup() {
  const h = history();
  h.at(-1)!.low = 135;
  return h;
}
const evaluate = (h: Candle[], now = at, m = macro()) =>
  evaluateClosedMarket("BTC/EUR", "4h", h, F, now, undefined, m);
const rows = (h: Candle[]) =>
  h.map((c) => ({
    ...c,
    symbol: "BTCEUR",
    time: new Date(c.timestamp),
    open: String(c.open),
    high: String(c.high),
    low: String(c.low),
    close: String(c.close),
    volume: String(c.volume),
  })) as unknown as MarketCandle[];
test("4h pullbacks require 200 completed daily bars; hourly or 4h EMA200 cannot substitute", () => {
  const h = setup(),
    r = evaluate(h);
  assert(r.shouldBuy);
  assert(r.macroBullish);
  assert(r.pullbackTo20);
  assert.equal(evaluate(history()).shouldBuy, false);
  assert.equal(
    evaluateMacroTrend(
      macro().filter((_, i) => i !== 100),
      at,
    ).reason,
    "NON_CONTINUOUS_OHLCV",
  );
  const bearish = setup();
  bearish.at(-1)!.open = 150;
  bearish.at(-1)!.high = 151;
  assert.equal(evaluate(bearish).shouldBuy, false);
  assert.equal(
    evaluate(h, at, macro().slice(-199)).reason,
    "INSUFFICIENT_CLOSED_DAILY_MACRO_HISTORY",
  );
  assert.equal(evaluate(h.slice(-49)).reason, "INSUFFICIENT_CLOSED_CANDLES");
  assert.equal(evaluate(h, at + F).reason, "STALE_CLOSED_CANDLE");
  assert.equal(
    evaluate(h.filter((_, i) => i !== 100)).reason,
    "NON_CONTINUOUS_OHLCV",
  );
  assert.equal(
    evaluateClosedMarket("BTC/EUR", "1h", h, 3600000, at).reason,
    "UNSUPPORTED_TIMEFRAME",
  );
  assert.equal(
    evaluate(
      h,
      at,
      macro().map((c) => ({ ...c, open: 99, close: 100, high: 101, low: 98 })),
    ).reason,
    "DAILY_MACRO_NOT_BULLISH",
  );
});
test("CCXT 4h+daily and replay share causal signals/risk and exclude future daily prices", async () => {
  const h = setup(),
    m = macro(),
    calls: string[] = [];
  const exchange = {
    has: { fetchOHLCV: true },
    timeframes: { "4h": true, "1d": true },
    loadMarkets: async () => {},
    market: () => ({ spot: true, active: true }),
    parseTimeframe: () => 14400,
    fetchOHLCV: async (
      _s: string,
      tf: string,
      _since?: number,
      limit?: number,
    ) => {
      calls.push(tf);
      assert.equal(limit, 720);
      const bars = tf === "1d" ? m : h,
        duration = tf === "1d" ? D : F;
      return [
        ...bars.map((c) => [
          c.timestamp,
          c.open,
          c.high,
          c.low,
          c.close,
          c.volume,
        ]),
        [Math.floor(at / duration) * duration, 999, 999, 1, 999, 1],
      ];
    },
  };
  const live = await createMarketAnalyzer(exchange, () => at)("BTC/EUR", "4h"),
    risk = new RiskManagerService(),
    replay = new EmaRsiReplayStrategy(risk);
  replay.setDailyHistory("BTCEUR", rows(m));
  const actual = new EmaRsiSpotStrategy(risk).signalFromAnalysis(live),
    historical = replay.evaluateCandles(rows(h));
  assert.equal(actual.action, "BUY");
  assert.equal(actual.executionPolicy, "MAKER_ONLY");
  assert.equal(actual.strategyVersion, SPOT_STRATEGY_VERSION);
  assert.deepEqual(actual.analysis, historical.analysis);
  assert.equal(actual.stopLoss, historical.stopLoss);
  assert.equal(actual.takeProfit, historical.takeProfit);
  assert.deepEqual(calls, ["4h", "1d"]);
  const future = {
    ...m.at(-1)!,
    timestamp: Math.floor(at / D) * D,
    open: 1,
    close: 1,
    high: 1,
    low: 1,
  };
  assert.deepEqual(
    evaluateMacroTrend([...m, future], at),
    evaluateMacroTrend(m, at),
  );
  assert.equal(
    evaluate(
      h,
      at,
      m.map((c) => ({ ...c, timestamp: c.timestamp - 2 * D })),
    ).reason,
    "STALE_DAILY_MACRO_HISTORY",
  );
});
test("passive entry keeps the structural stop and 2R target, and cannot stretch TP to bypass costs", () => {
  const strategy = new EmaRsiSpotStrategy(new RiskManagerService());
  const signal = strategy.signalFromAnalysis(evaluate(setup()));
  assert.equal(signal.action, "BUY");
  const entry = (signal.entryPrice + signal.stopLoss!) / 2;
  const rebased = rebaseSignalAtEntry(signal, entry)!;
  assert(rebased);
  assert.equal(rebased.stopLoss, signal.stopLoss);
  assert(
    Math.abs((rebased.takeProfit - entry) / (entry - rebased.stopLoss) - 2) <
      1e-12,
  );
  assert(rebased.takeProfit < signal.takeProfit!);
  assert.deepEqual(rebaseSignalAtEntry(rebased, entry), rebased);
  const narrow = rebaseSignalAtEntry(signal, signal.stopLoss! * 1.0001)!;
  assert(narrow);
  assert.equal(hasPositiveNetTarget(narrow, 0.004, 0), false);
  assert.equal(rebaseSignalAtEntry(signal, signal.stopLoss!), null);
  // Persisted legacy snapshots explicitly keep their original risk levels.
  const legacy = rebaseSignalAtEntry(
    { ...signal, preserveTakeProfit: true },
    entry,
  )!;
  assert.equal(legacy.takeProfit, signal.takeProfit);
});

test("liquidity selection is top 30 actual EUR turnover, excludes fiat/stables/offline, and normalizes Kraken aliases", () => {
  const pairs: Parameters<typeof rankEurMarkets>[0] = {},
    tickers: Parameters<typeof rankEurMarkets>[1] = {};
  for (let i = 0; i < 35; i++) {
    pairs[`k${i}`] = { wsname: `COIN${i}/EUR`, status: "online" };
    tickers[`k${i}`] = { v: ["0", String(i + 1)], p: ["0", "10"] };
  }
  for (const base of ["USDT", "USDC", "EURC", "USD"]) {
    pairs[base] = { wsname: `${base}/EUR`, status: "online" };
    tickers[base] = { v: ["0", "1000000"], p: ["0", "1"] };
  }
  pairs.btc = { wsname: "XBT/EUR", status: "online" };
  tickers.btc = { v: ["0", "1000"], p: ["0", "100"] };
  pairs.off = { wsname: "OFF/EUR", status: "cancel_only" };
  tickers.off = { v: ["0", "100000"], p: ["0", "100"] };
  const ranked = rankEurMarkets(pairs, tickers);
  assert.equal(ranked.length, 30);
  assert.equal(ranked[0].symbol, "BTCEUR");
  assert.equal(ranked[1].symbol, "COIN34EUR");
  assert.equal(ranked.at(-1)!.symbol, "COIN6EUR");
  assert.equal(supportedTradingSymbols.length, 30);
  assert.equal(normalizeTradingSymbol("mateur"), "MATEUR");
  assert.throws(() => normalizeTradingSymbol("ETHETH"));
  assert.throws(() => normalizeTradingSymbol("USDCEUR"));
});

test("live watchlist refresh coalesces, caches for 24h, and rejects failed refresh without replacing the prior selection", async () => {
  let now = at,
    calls = 0,
    fail = false;
  const initial = [...supportedTradingSymbols],
    pairs: Parameters<typeof rankEurMarkets>[0] = {},
    tickers: Parameters<typeof rankEurMarkets>[1] = {};
  for (let i = 0; i < 35; i++) {
    pairs[`k${i}`] = { wsname: `COIN${i}/EUR`, status: "online" };
    tickers[`k${i}`] = { v: ["0", String(i + 1)], p: ["0", "10"] };
  }
  const clock = mock.method(Date, "now", () => now),
    transport = mock.method(
      globalThis,
      "fetch",
      async (url: string | URL | Request) => {
        calls++;
        if (fail) throw new Error("offline");
        return new Response(
          JSON.stringify({
            error: [],
            result: String(url).endsWith("AssetPairs") ? pairs : tickers,
          }),
          { status: 200 },
        );
      },
    );
  try {
    await Promise.all([refreshTradingWatchlist(), refreshTradingWatchlist()]);
    assert.equal(calls, 2);
    assert.equal(supportedTradingSymbols.length, 30);
    assert.equal(supportedTradingSymbols[0], "COIN34EUR");
    assert.equal(+watchlistStatus().refreshedAt!, now);
    await refreshTradingWatchlist();
    assert.equal(calls, 2);
    const selected = [...supportedTradingSymbols];
    now += D;
    fail = true;
    await assert.rejects(refreshTradingWatchlist(), /offline/);
    assert.deepEqual(supportedTradingSymbols, selected);
  } finally {
    clock.mock.restore();
    transport.mock.restore();
    supportedTradingSymbols.splice(
      0,
      supportedTradingSymbols.length,
      ...initial,
    );
  }
});
