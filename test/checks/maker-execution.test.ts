import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceMakerPosition,
  fillMakerBuy,
  initialMakerPosition,
  isPassiveLimit,
  MAKER_FEE_RATE,
  makerEntryWindow,
  MARKET_STOP_BREAK_EVEN_CUSHION,
  STOP_MARKET_SLIPPAGE_RATE,
} from "../../src/production/trading/maker-execution";
import { FOUR_HOURS_MS } from "../../src/production/trading/ccxt/analyze-market";
import { TradingSignal } from "../../src/production/signals/signal.types";
import { simulateSpotBasket } from "../research/backtesting/spot-basket-simulation";
import { calculateSpotPositionSize } from "../../src/production/trading/spot-position-sizing";
const supportedTradingSymbols = [
  "BTCEUR",
  "ETHEUR",
  "SOLEUR",
  "LINKEUR",
  "AVAXEUR",
  "DOTEUR",
  "ADAEUR",
];
import { MarketCandle } from "../../src/production/market-data/entities/market-candle.entity";
import { Timeframe } from "../../src/production/assets/enums/timeframe.enum";
const start = Date.parse("2025-01-01"),
  H = FOUR_HOURS_MS;
const signal = {
  action: "BUY",
  entryPrice: 100,
  stopLoss: 90,
  takeProfit: 120,
  executionPolicy: "MAKER_ONLY",
  minimumRewardRisk: 1,
  minimumNetRewardRisk: 0.5,
  preserveTakeProfit: true,
} as TradingSignal;
function bar(i: number, change: Record<string, number> = {}) {
  return {
    time: new Date(start + i * H),
    open: 101,
    high: 105,
    low: 95,
    close: 100,
    volume: 1,
    ...change,
  };
}

test("post-only entries forbid crossed submissions and same-bar/touch-only/gapped fills", () => {
  assert(isPassiveLimit("BUY", 100, 100, 101));
  assert(!isPassiveLimit("BUY", 101, 100, 101));
  assert(!isPassiveLimit("SELL", 100, 100, 101));
  assert(isPassiveLimit("SELL", 101, 100, 101));
  assert.throws(() => makerEntryWindow(NaN), /INVALID_MAKER_ORDER_TIME/);
  const posted = start + 10000;
  assert.equal(makerEntryWindow(posted).expiresAt - posted, 6 * H);
  assert.equal(makerEntryWindow(posted).eligibleAt, start + H);
  assert.equal(fillMakerBuy(signal, bar(0), posted), null);
  assert.equal(fillMakerBuy(signal, bar(1, { low: 100 }), posted), null);
  assert.equal(fillMakerBuy(signal, bar(1, { open: 99 }), posted), null);
  assert.equal(fillMakerBuy(signal, bar(5), posted)?.entryPrice, 100);
  assert.equal(fillMakerBuy(signal, bar(6), posted), null);
  assert.equal(fillMakerBuy(signal, bar(1, { volume: 0 }), posted), null);
  assert.equal(fillMakerBuy(signal, bar(1), posted)?.entryPrice, 100);
  assert.equal(
    fillMakerBuy({ ...signal, executionPolicy: undefined }, bar(1), posted),
    null,
  );
});

test("Maker stop gaps remain unfilled until a later passive sell can fill", () => {
  let state = initialMakerPosition(signal, start);
  let step = advanceMakerPosition(
    signal,
    state,
    bar(0, { open: 85, high: 88, low: 80, close: 85 }),
  );
  assert.equal(step.exitPrice, null);
  assert.equal(step.state.stopTriggered, true);
  assert.equal(step.state.stopLimit, 90);
  step = advanceMakerPosition(
    signal,
    step.state,
    bar(1, { open: 85, high: 89, low: 80, close: 85 }),
  );
  assert.equal(step.exitPrice, null);
  step = advanceMakerPosition(
    signal,
    step.state,
    bar(2, { open: 85, high: 91, low: 80, close: 88 }),
  );
  assert.equal(step.exitPrice, 90);
  assert.equal(step.exitReason, "STOP_LOSS");
});

test("market stops use adverse gap opens and slippage, while ambiguous bars choose SL before TP", () => {
  const current = { ...signal, stopExecutionPolicy: "MARKET_STOP" as const };
  const gap = advanceMakerPosition(
    current,
    initialMakerPosition(current, start),
    bar(0, { open: 85, high: 88, low: 80, close: 85 }),
  );
  assert.equal(gap.exitPrice, 85 * (1 - STOP_MARKET_SLIPPAGE_RATE));
  assert.equal(gap.exitReason, "STOP_LOSS");
  assert.equal(gap.state.stopLimit, null);
  const both = advanceMakerPosition(
    current,
    initialMakerPosition(current, start),
    bar(0, { high: 125, low: 85 }),
  );
  assert.equal(both.exitReason, "STOP_LOSS");
  assert.equal(both.exitPrice, 90 * (1 - STOP_MARKET_SLIPPAGE_RATE));
  const tp = advanceMakerPosition(
    current,
    initialMakerPosition(current, start),
    bar(0, { high: 121 }),
  );
  assert.equal(tp.exitPrice, 120);
  assert.equal(tp.exitSlippagePerUnit, undefined);
});

test("market-stop protection covers modeled fees/slippage only on later bars; sizing includes stop friction", () => {
  const current = { ...signal, stopExecutionPolicy: "MARKET_STOP" as const };
  const armed = advanceMakerPosition(
    current,
    initialMakerPosition(current, start),
    bar(0, { high: 115, low: 95, close: 110 }),
  );
  assert.equal(armed.exitPrice, null);
  assert.equal(
    armed.state.activeStop,
    100 * (1 + MARKET_STOP_BREAK_EVEN_CUSHION),
  );
  const exit = advanceMakerPosition(
    current,
    armed.state,
    bar(1, { open: 105, high: 110, low: 95, close: 100 }),
  );
  assert.equal(exit.exitReason, "PROFIT_PROTECTION");
  assert(exit.exitPrice! * (1 - 0.004) - 100 * (1 + 0.004) > 0);
  const size = calculateSpotPositionSize(
    100,
    90,
    1000,
    0.01,
    100,
    0.004,
    0.001,
  )!;
  assert(size.quantity * (100 * 1.004 - 90 * 0.999 * 0.996) <= 10 + 1e-8);
  assert.equal(
    calculateSpotPositionSize(100, 90, 1000, 0.01, 100, 0.004, -1),
    null,
  );
});

test("1.5R fee-cushioned stop is causal, monotonic and covers the fixed Maker fees", () => {
  let step = advanceMakerPosition(
    signal,
    initialMakerPosition(signal, start),
    bar(0, { high: 115, low: 95, close: 110 }),
  );
  assert.equal(step.exitPrice, null);
  assert(Math.abs(Number(step.state.activeStop) - 100.85) < 1e-10);
  assert.equal(step.state.stopTriggered, false);
  step = advanceMakerPosition(
    signal,
    step.state,
    bar(1, { open: 105, high: 110, low: 94, close: 95 }),
  );
  assert.equal(step.exitPrice, null);
  assert(Math.abs(Number(step.state.activeStop) - 100.85) < 1e-10);
  assert(Math.abs(Number(step.state.stopLimit) - 100.85) < 1e-10);
  step = advanceMakerPosition(
    signal,
    step.state,
    bar(2, { open: 95, high: 101, low: 94, close: 100 }),
  );
  assert(Math.abs(Number(step.exitPrice) - 100.85) < 1e-10);
  assert.equal(step.exitReason, "PROFIT_PROTECTION");
  const net = step.exitPrice! - 100 - (step.exitPrice! + 100) * MAKER_FEE_RATE;
  assert(Math.abs(net - 0.0466) < 1e-12);
});

test("TP needs strict trade-through; ambiguous stop/target bars arm SL first", () => {
  const state = initialMakerPosition(signal, start);
  assert.equal(
    advanceMakerPosition(signal, state, bar(0, { high: 120 })).exitPrice,
    null,
  );
  assert.equal(
    advanceMakerPosition(signal, state, bar(0, { high: 121 })).exitPrice,
    120,
  );
  const both = advanceMakerPosition(
    signal,
    state,
    bar(0, { high: 125, low: 85 }),
  );
  assert.equal(both.exitPrice, null);
  assert.equal(both.state.stopTriggered, true);
});

function basket(length = 205) {
  return Object.fromEntries(
    supportedTradingSymbols.map((symbol) => [
      symbol,
      Array.from(
        { length },
        (_, i) =>
          ({
            ...bar(i, { low: 99, high: 105 }),
            symbol,
            timeframe: Timeframe.FOUR_HOURS,
            volume: "1",
          }) as unknown as MarketCandle,
      ),
    ]),
  );
}
const fake = {
  minimumHistory: 200,
  evaluateCandles: (history: MarketCandle[]) => ({
    ...signal,
    candleTime: history.at(-1)?.time ?? new Date(start),
    analysis: {
      indicators: { ema200: 80 },
      evidence: { macroTrendBullish: true },
    } as unknown as TradingSignal["analysis"],
  }),
};
const options = {
  startingBalanceEUR: 1000,
  riskPerTrade: 0.01,
  maximumInvestedEUR: 100,
};
test("shared EUR replay reserves funds/slots, permits seven pending limits and caps filled positions at six, and never spends future exits", () => {
  const r = simulateSpotBasket(basket(), fake, options);
  assert.equal(r.maximumConcurrentOpen, 6);
  assert.equal(r.maximumPendingOrders, 7);
  assert.equal(r.maximumConcurrentCommitted, 7);
  assert.equal(r.counters.filled, 6);
  assert.equal(r.openPositions.length, 6);
  assert.equal(r.pendingOrders.length, 0);
  assert(r.counters.capacityRejected > 0);
  assert.equal(r.counters.capacityCancelled, 1);
  assert(r.summary.cashEUR >= 0);
  assert.equal(r.summary.closed, 0);
  assert.equal(r.execution.feePerSide, 0.004);
  assert.equal(r.execution.makerFillsValidated, false);
  assert(r.summary.markedEquityEUR < 1000);
  assert(r.summary.markedEquityEUR > 997);
});
test("unknown gaps freeze exposed positions and no unsupported/missing source is silently fabricated", () => {
  const data = basket(208);
  for (const symbol of supportedTradingSymbols)
    data[symbol] = data[symbol].filter((_, i) => i !== 203);
  const r = simulateSpotBasket(data, fake, {
    ...options,
    continuousCommonWindow: false,
  });
  assert.equal(r.counters.dataGaps, 6);
  assert(r.openPositions.every((p) => p.unresolvedDataGap));
  assert.equal(r.summary.closed, 0);
  const missing = basket();
  missing.AVAXEUR = [];
  assert.throws(() => simulateSpotBasket(missing, fake, options), /Missing 4h/);
});

test("default historical coverage selects the longest common continuous range without consulting outcomes", () => {
  const data = basket(420);
  for (const symbol of supportedTradingSymbols)
    data[symbol] = data[symbol].filter((_, i) => i !== 205);
  const r = simulateSpotBasket(data, fake, options);
  assert.equal(r.coverage.mode, "LONGEST_COMMON_CONTINUOUS_WINDOW");
  assert.equal(r.coverage.selectedFourHourBars, 214);
  assert.equal(+r.start, start + 206 * H);
  assert.equal(r.counters.dataGaps, 0);
});

test("a resting entry can fill after four 4h candles, but a proven non-fill expires after 24h", () => {
  const late = basket(207);
  for (const rows of Object.values(late))
    for (const [i, c] of rows.entries()) c.low = String(i === 204 ? 99 : 100);
  const r = simulateSpotBasket(
    late,
    {
      ...fake,
      evaluateCandles: (h) => ({
        ...fake.evaluateCandles(h),
        action: h.length === 200 ? "BUY" : "NO_TRADE",
      }),
    },
    options,
  );
  assert.equal(r.counters.filled, 6);
  assert(r.openPositions.every((p) => +p.openedAt === start + 205 * H));
  assert.equal(r.maximumConcurrentOpen, 6);
  const never = basket(206);
  for (const rows of Object.values(never)) for (const c of rows) c.low = "100";
  const expired = simulateSpotBasket(
    never,
    {
      ...fake,
      evaluateCandles: (h) => ({
        ...fake.evaluateCandles(h),
        action: h.length === 200 ? "BUY" : "NO_TRADE",
      }),
    },
    options,
  );
  assert.equal(expired.counters.filled, 0);
  assert.equal(expired.counters.expired, 7);
  assert.equal(expired.summary.markedEquityEUR, 1000);
});
test("macro reversal cancels an unfilled order before any entry, even inside its TTL", () => {
  const changing = {
    minimumHistory: 200,
    evaluateCandles: (h: MarketCandle[]) => {
      const s = fake.evaluateCandles(h);
      const bullish = +h.at(-1)!.time < start + 200 * H;
      return {
        ...s,
        action: bullish ? ("BUY" as const) : ("NO_TRADE" as const),
        analysis: { ...s.analysis!, evidence: { macroTrendBullish: bullish } },
      };
    },
  };
  const r = simulateSpotBasket(basket(), changing, options);
  assert.equal(r.counters.macroCancelled, 7);
  assert.equal(r.counters.filled, 0);
  assert.equal(r.summary.cashEUR, 1000);
  assert.equal(r.pendingOrders.length, 0);
});

test("daily watchlist rotation retains filled positions outside the next selection", () => {
  const all = [...supportedTradingSymbols];
  const r = simulateSpotBasket(basket(208), fake, {
    ...options,
    watchlistAt: (time) =>
      time < start + 203 * H ? all.slice(0, 6) : all.slice(1),
  });
  assert.equal(r.maximumConcurrentOpen, 6);
  assert.equal(r.watchlist.dynamic, true);
  assert.equal(r.watchlist.history.length, 2);
  assert(r.openPositions.some((p) => p.symbol === "BTCEUR"));
  assert(!r.watchlist.history.at(-1)!.symbols.includes("BTCEUR"));
  assert.equal(r.summary.closed, 0);
});

test("persisted hourly exits use their recorded duration after the 4h entry rollback", () => {
  const hour = 3_600_000;
  const first = {
    ...bar(0),
    time: new Date(start),
    open: 85,
    high: 89,
    low: 80,
    close: 85,
  };
  let step = advanceMakerPosition(
    signal,
    initialMakerPosition(signal, start),
    first,
    hour,
  );
  assert.equal(step.exitPrice, null);
  assert.equal(step.state.eligibleAt, start + hour);
  step = advanceMakerPosition(
    signal,
    step.state,
    { ...first, time: new Date(start + hour), high: 91 },
    hour,
  );
  assert.equal(step.exitPrice, 90);
});

test("verified official no-trade intervals neither invent candles nor freeze positions; unverified gaps still freeze", () => {
  const data = basket(208),
    coverage: Record<string, { from: number; through: number }> = {};
  for (const symbol of supportedTradingSymbols) {
    data[symbol] = data[symbol].filter((_, i) => i !== 203);
    coverage[symbol] = { from: start, through: start + 208 * H };
  }
  const r = simulateSpotBasket(data, fake, {
    ...options,
    continuousCommonWindow: false,
    verifiedNoTradeCoverage: coverage,
  });
  assert.equal(r.counters.dataGaps, 0);
  assert.equal(r.counters.verifiedEmptyIntervals, 6);
  assert.equal(r.maximumConcurrentOpen, 6);
  assert(r.openPositions.every((p) => !p.unresolvedDataGap));
  assert.equal(r.summary.closed, 0);
});

test("hourly replay evaluates 4h signals only, fills before the next 4h close, and rejects missing hourly sources", () => {
  const data = basket(205);
  const hourly = Object.fromEntries(
    Object.entries(data).map(([symbol, bars]) => [
      symbol,
      bars.flatMap((b) =>
        Array.from({ length: 4 }, (_, i) => ({
          ...b,
          timeframe: Timeframe.ONE_HOUR,
          time: new Date(+b.time + i * 3_600_000),
        })),
      ),
    ]),
  );
  const calls: number[] = [];
  const oneShot = {
    ...fake,
    evaluateCandles: (h: MarketCandle[]) => {
      calls.push(+h.at(-1)!.time);
      return {
        ...fake.evaluateCandles(h),
        action: h.length === 200 ? ("BUY" as const) : ("NO_TRADE" as const),
      };
    },
  };
  const r = simulateSpotBasket(data, oneShot, {
    ...options,
    executionDatasets: hourly,
  });
  assert.equal(r.executionTimeframe, "1h");
  assert.equal(r.counters.filled, 6);
  assert(
    r.openPositions.every(
      (p) => +p.openedAt === start + 200 * H + 2 * 3_600_000,
    ),
  );
  assert.equal(r.execution.ttlExecutionCandles, 24);
  // Strategy receives closed 4h history for both admission and macro checks.
  assert(calls.every((t) => t % H === 0));
  assert.throws(
    () =>
      simulateSpotBasket(data, oneShot, {
        ...options,
        executionDatasets: { ...hourly, AVAXEUR: [] },
      }),
    /Missing 1h/,
  );
});

test("unknown pending hourly history cannot be replaced with a later fill or release its reservation", () => {
  const data = basket(208),
    hour = 3_600_000;
  const hourly = Object.fromEntries(
    Object.entries(data).map(([symbol, bars]) => [
      symbol,
      bars
        .flatMap((b) =>
          Array.from({ length: 4 }, (_, i) => ({
            ...b,
            timeframe: Timeframe.ONE_HOUR,
            time: new Date(+b.time + i * hour),
          })),
        )
        .filter((b) => +b.time !== start + 200 * H + hour),
    ]),
  );
  const oneShot = {
    ...fake,
    evaluateCandles: (h: MarketCandle[]) => ({
      ...fake.evaluateCandles(h),
      action: h.length === 200 ? ("BUY" as const) : ("NO_TRADE" as const),
    }),
  };
  const r = simulateSpotBasket(data, oneShot, {
    ...options,
    executionDatasets: hourly,
    continuousCommonWindow: false,
  });
  assert.equal(r.counters.filled, 0);
  assert.equal(r.counters.expired, 0);
  assert.equal(r.counters.dataGaps, 7);
  assert(r.pendingOrders.every((p) => p.unresolvedDataGap));
  assert(r.summary.cashEUR < 1000);
  assert(
    Math.abs(
      r.summary.cashEUR +
        r.pendingOrders.reduce((sum, p) => sum + p.reservedEUR, 0) -
        1000,
    ) < 1e-8,
  );
});
