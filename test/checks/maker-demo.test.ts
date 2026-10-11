import { DemoTradingScheduler } from "../../src/production/demo-trading/demo-trading.scheduler";
import "reflect-metadata";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { DemoTradingService } from "../../src/production/demo-trading/demo-trading.service";
import { DemoPosition } from "../../src/production/demo-trading/entities/demo-position.entity";
import { AlertDelivery } from "../../src/production/alerts/entities/alert-delivery.entity";
import { MarketDataService } from "../../src/production/market-data/market-data.service";
import { MarketCandle } from "../../src/production/market-data/entities/market-candle.entity";
import { SignalsService } from "../../src/production/signals/signals.service";
import { StrategyApprovalService } from "../../src/production/strategy-approval/strategy-approval.service";
import { Timeframe } from "../../src/production/assets/enums/timeframe.enum";
import { TradingSignal } from "../../src/production/signals/signal.types";
import {
  DAILY_MS,
  FOUR_HOURS_MS,
  MarketAnalysis,
  SPOT_STRATEGY_VERSION,
} from "../../src/production/trading/ccxt/analyze-market";
const start = Date.parse("2026-10-06T08:00:00Z"),
  H = FOUR_HOURS_MS,
  E = 3_600_000;

function harness() {
  const positions: DemoPosition[] = [],
    events: AlertDelivery[] = [],
    bars: MarketCandle[] = [];
  let positionRepository: Repository<DemoPosition>;
  const macros = Array.from({ length: 220 }, (_, i) => ({
    symbol: "BTCEUR",
    time: new Date(
      Math.floor(start / DAILY_MS) * DAILY_MS + (i - 200) * DAILY_MS,
    ),
    open: 50 + i * 0.25 - 0.1,
    high: 51 + i * 0.25,
    low: 49 + i * 0.25,
    close: 50 + i * 0.25,
    volume: 1,
  })) as unknown as MarketCandle[];
  const ledger = {
    find: async (options: { where: Record<string, unknown> }) =>
      events.filter((e) =>
        Object.entries(options.where).every(([key, value]) =>
          key === "candleTime"
            ? +e.candleTime === +new Date(value as Date)
            : Reflect.get(e, key) === value,
        ),
      ),
  };
  const manager = {
    query: async () => [],
    transaction: async (work: (m: unknown) => Promise<unknown>) =>
      work(manager),
    getRepository: (entity: unknown) =>
      entity === DemoPosition ? positionRepository : ledger,
    insert: async (_entity: unknown, value: AlertDelivery) => {
      if (
        events.some(
          (e) =>
            e.symbol === value.symbol &&
            +e.candleTime === +value.candleTime &&
            e.action === value.action,
        )
      )
        throw new Error("Duplicate ledger event");
      const payload = value.payload
        ? JSON.parse(JSON.stringify(value.payload))
        : null;
      events.push(
        Object.assign(new AlertDelivery(), value, {
          id: events.length + 1,
          payload,
        }),
      );
    },
    save: async (entity: unknown, value: DemoPosition | AlertDelivery) => {
      if (entity === DemoPosition) {
        const p = value as DemoPosition;
        if (!p.id) {
          p.id = positions.length + 1;
          positions.push(p);
        }
        return p;
      }
      return value;
    },
  };
  positionRepository = {
    manager,
    create: (value: DemoPosition) => Object.assign(new DemoPosition(), value),
    find: async (options: { where: { status: unknown } }) =>
      positions.filter((p) =>
        typeof options.where.status === "string"
          ? p.status === options.where.status
          : p.status !== "OPEN",
      ),
    findOne: async (options: { where: { symbol: string; status: string } }) =>
      positions.find(
        (p) =>
          p.symbol === options.where.symbol &&
          p.status === options.where.status,
      ) ?? null,
    save: async (value: DemoPosition) => manager.save(DemoPosition, value),
  } as unknown as Repository<DemoPosition>;
  const signal = {
    strategyVersion: SPOT_STRATEGY_VERSION,
    action: "BUY",
    entryPrice: 100,
    stopLoss: 90,
    takeProfit: 120,
    candleTime: new Date(start - H),
    minimumRewardRisk: 1,
    minimumNetRewardRisk: 0.5,
    preserveTakeProfit: true,
    executionPolicy: "MAKER_ONLY",
    reason: "test pullback",
  } as TradingSignal;
  const snapshot = {
    symbol: "BTC/EUR",
    timeframe: "4h",
    shouldBuy: true,
    reason: "test pullback",
    candle: {
      timestamp: start - H,
      open: 99,
      high: 101,
      low: 95,
      close: 100,
      volume: 1,
    },
    closedHistory: [],
    atr14: 1,
  } as MarketAnalysis;
  const signals = {
    isUnifiedStrategyActive: () => true,
    signalFromMarketAnalysis: () => signal,
  } as unknown as SignalsService;
  const data = {
    getBestBidAsk: async () => ({ bid: 100, ask: 101 }),
    getHistoricalCandles: async (_symbol: string, tf: Timeframe) =>
      tf === Timeframe.ONE_DAY
        ? [...macros, ...bars.filter((c) => c.timeframe === Timeframe.ONE_DAY)]
        : bars.filter((c) => (c.timeframe ?? Timeframe.FOUR_HOURS) === tf),
  } as unknown as MarketDataService;
  const settings = new ConfigService({
    ACTIVE_STRATEGY_VERSION: SPOT_STRATEGY_VERSION,
    EXPLORATORY_DEMO_ENABLED: "true",
    EXPLORATORY_DEMO_START_AT: "2020-01-01",
    DEMO_ENTRIES_PAUSED: "false",
    MAX_DEMO_OPEN_POSITIONS: 99,
    BACKTESTING_FEE_RATE: 0,
  });
  const createService = () =>
    new DemoTradingService(
      positionRepository,
      signals,
      data,
      {} as StrategyApprovalService,
      settings,
    );
  return {
    demo: createService(),
    createService,
    events,
    positions,
    bars,
    settings,
    snapshot,
    signal,
  };
}

test("Demo queues a durable passive limit, survives restart/JSON dates and admission pause, and opens only after a fill", async () => {
  let now = start + 10000;
  const clock = mock.method(Date, "now", () => now);
  try {
    const h = harness(),
      queued = await h.demo.openCcxtPosition(h.snapshot);
    assert.equal(queued.position, null);
    assert.equal(h.positions.length, 0);
    assert.equal(
      h.events.filter((e) => e.action === "MAKER_ENTRY_PENDING").length,
      1,
    );
    assert.equal(
      h.events.filter((e) => e.action === "CCXT_SIGNAL_COMMITTED").length,
      1,
    );
    assert.equal(
      typeof h.events.find((e) => e.action === "MAKER_ENTRY_PENDING")!.payload!
        .makerEntry!.signal.candleTime,
      "string",
    );
    h.settings.set("DEMO_ENTRIES_PAUSED", "true");
    // Compatibility with orders already persisted before hourly execution.
    delete h.events.find((e) => e.action === "MAKER_ENTRY_PENDING")!.payload!
      .makerEntry!.executionTimeframe;
    h.bars.push({
      symbol: "BTCEUR",
      timeframe: Timeframe.ONE_HOUR,
      time: new Date(start),
      open: "101",
      high: "105",
      low: "99",
      close: "100",
      volume: "1",
    } as MarketCandle);
    h.bars.push({
      symbol: "BTCEUR",
      timeframe: Timeframe.ONE_HOUR,
      time: new Date(start + E),
      open: "101",
      high: "105",
      low: "99",
      close: "100",
      volume: "1",
    } as MarketCandle);
    const restarted = h.createService();
    now = start + E + 10000;
    await restarted.checkOpenPositions();
    assert.equal(
      h.positions.length,
      0,
      "placement bar and incomplete next bar cannot fill",
    );
    now = start + 2 * E + 10000;
    await restarted.checkOpenPositions();
    assert.equal(h.positions.length, 1);
    assert.equal(h.positions[0].entry, 100);
    assert.equal(+h.positions[0].openedAt, start + 2 * E);
    assert.equal(h.positions[0].timeframe, Timeframe.FOUR_HOURS);
    assert.equal(h.positions[0].executionTimeframe, Timeframe.ONE_HOUR);
    assert.equal(Number(h.positions[0].entrySlippage), 0);
    assert(
      Math.abs(
        Number(h.positions[0].entryFee) /
          Number(h.positions[0].investedAmount) -
          0.004,
      ) < 1e-12,
    );
    assert.equal(
      h.events.filter((e) => e.action === "MAKER_ENTRY_FILLED").length,
      1,
    );
    assert.equal(
      h.events.filter((e) => e.action === "DEMO_OPEN_PENDING:1").length,
      1,
    );
    h.bars.push({
      symbol: "BTCEUR",
      timeframe: Timeframe.ONE_HOUR,
      time: new Date(start + 2 * E),
      open: "110",
      high: "121",
      low: "105",
      close: "120",
      volume: "1",
    } as MarketCandle);
    now = start + 3 * E + 10000;
    const exited = await h.createService().checkOpenPositions();
    assert.equal(h.positions[0].status, "WIN");
    assert.equal(+h.positions[0].closedAt!, start + 3 * E);
    assert.equal(exited.processed[0].exitCandleTimeframe, "1h");
    await restarted.checkOpenPositions();
    assert.equal(h.positions.length, 1);
    assert.equal(
      h.events.filter((e) => e.action === "DEMO_OPEN_PENDING:1").length,
      1,
    );
  } finally {
    clock.mock.restore();
  }
});

test("accepted market-stop policy survives restart and the ledger accounts for slippage exactly once", async () => {
  let now = start + 10_000;
  const clock = mock.method(Date, "now", () => now);
  try {
    const h = harness();
    h.signal.stopExecutionPolicy = "MARKET_STOP";
    await h.demo.openCcxtPosition(h.snapshot);
    h.bars.push({
      ...storedBar(start + E, { open: 101, high: 105, low: 99, close: 100 }),
      timeframe: Timeframe.ONE_HOUR,
    });
    now = start + 2 * E + 10_000;
    await h.createService().checkOpenPositions();
    const p = h.positions[0];
    assert.equal(p.stopExecutionPolicy, "MARKET_STOP");
    h.bars.push({
      ...storedBar(start + 2 * E, { open: 85, high: 88, low: 80, close: 85 }),
      timeframe: Timeframe.ONE_HOUR,
    });
    now = start + 3 * E + 10_000;
    await h.createService().checkOpenPositions();
    assert.equal(p.status, "LOSS");
    assert.equal(p.exitPrice, 85 * 0.999);
    assert(
      Math.abs(Number(p.exitSlippage) - Number(p.quantity) * 0.085) < 1e-10,
    );
    const expected =
      Number(p.quantity) * Number(p.exitPrice) * 0.996 -
      Number(p.investedAmount) -
      Number(p.entryFee);
    assert(Math.abs(Number(p.realizedPnlQuote) - expected) < 1e-10);
    await h.createService().checkOpenPositions();
    assert.equal(
      h.events.filter((e) => e.action === "DEMO_CLOSE_PENDING:1").length,
      1,
    );
  } finally {
    clock.mock.restore();
  }
});

test("24h TTL frees proven unfilled capital; unknown fill history remains quarantined", async () => {
  let now = start + 10000;
  const clock = mock.method(Date, "now", () => now);
  try {
    const h = harness();
    await h.demo.openCcxtPosition(h.snapshot);
    now = start + 6 * H + 10000;
    await h.demo.checkOpenPositions();
    assert.equal((await h.demo.getPendingMakerOrders()).length, 1);
    for (let i = 1; i < 24; i++)
      h.bars.push({
        symbol: "BTCEUR",
        timeframe: Timeframe.ONE_HOUR,
        time: new Date(start + i * E),
        open: "101",
        high: "105",
        low: "100",
        close: "102",
        volume: "1",
      } as MarketCandle);
    await h.demo.checkOpenPositions();
    assert.equal((await h.demo.getPendingMakerOrders()).length, 0);
    assert.equal(h.positions.length, 0);
    assert.equal(
      h.events.filter((e) => e.action === "MAKER_ENTRY_EXPIRED").length,
      1,
    );
  } finally {
    clock.mock.restore();
  }
});

function storedPosition(openedAt = start) {
  return Object.assign(new DemoPosition(), {
    id: 1,
    symbol: "BTCEUR",
    timeframe: "4h",
    strategyVersion: "ccxt-ema50-rsi14-mtf-v2",
    mode: "EXPERIMENTAL",
    side: "BUY",
    entry: 100,
    stopLoss: 90,
    takeProfit: 120,
    quantity: 1,
    investedAmount: 100,
    entryFee: 0.05,
    entrySlippage: 0.05,
    status: "OPEN",
    openedAt: new Date(openedAt),
    realizedPnlQuote: null,
  });
}
function storedBar(time: number, values: Record<string, number>) {
  return {
    symbol: "BTCEUR",
    time: new Date(time),
    volume: "1",
    ...values,
  } as unknown as MarketCandle;
}

test("stored legacy cost basis/SL/TP survive; exits switch to Maker without gap market fills", async () => {
  let now = start + 2 * H + 10000;
  const clock = mock.method(Date, "now", () => now);
  try {
    const h = harness(),
      p = storedPosition(start + 3600000);
    h.positions.push(p);
    h.bars.push(
      storedBar(start + H, { open: 85, high: 88, low: 80, close: 85 }),
    );
    const first = await h.demo.checkOpenPositions();
    assert.equal(p.status, "OPEN");
    assert.equal(first.processed[0].pendingStopLimit, 90);
    assert.equal(h.events.length, 0);
    h.bars.push(
      storedBar(start + 2 * H, { open: 85, high: 91, low: 80, close: 88 }),
    );
    now = start + 3 * H + 10000;
    const second = await h.demo.checkOpenPositions();
    assert.equal(p.exitPrice, 90);
    assert.equal(second.processed[0].exitCandleTimeframe, "4h");
    assert.equal(p.entryFee, 0.05);
    assert.equal(p.entrySlippage, 0.05);
    assert.equal(p.stopLoss, 90);
    assert.equal(p.takeProfit, 120);
    assert.equal(p.exitFee, 0.36);
    assert(Math.abs(Number(p.realizedPnlQuote) + 10.46) < 1e-12);
  } finally {
    clock.mock.restore();
  }
});

test("Demo restart reconstructs break-even from closed bars; missing entry history cannot fabricate exits", async () => {
  const clock = mock.method(Date, "now", () => start + 3 * H + 10000);
  try {
    const h = harness(),
      p = storedPosition();
    p.strategyVersion = SPOT_STRATEGY_VERSION;
    p.entryFee = 0.4;
    p.entrySlippage = 0;
    h.positions.push(p);
    h.bars.push(
      storedBar(start, { open: 101, high: 115, low: 95, close: 110 }),
      storedBar(start + H, { open: 105, high: 110, low: 94, close: 95 }),
      storedBar(start + 2 * H, { open: 95, high: 101, low: 94, close: 100 }),
    );
    await h.createService().checkOpenPositions();
    assert(Math.abs(Number(p.exitPrice) - 100.85) < 1e-10);
    assert.equal(p.exitReason, "PROFIT_PROTECTION");
    assert.equal(p.stopLoss, 90);
    assert(Math.abs(Number(p.resultR) - 0.00466) < 1e-12);
    const missing = harness(),
      open = storedPosition();
    missing.positions.push(open);
    missing.bars.push(
      storedBar(start + H, { open: 100, high: 125, low: 95, close: 121 }),
    );
    await missing.demo.checkOpenPositions();
    assert.equal(open.status, "OPEN");
    assert.equal(missing.events.length, 0);
  } finally {
    clock.mock.restore();
  }
});

test("pending orders do not lock slots for other assets; six filled positions block a new admission", async () => {
  const clock = mock.method(Date, "now", () => start + 10000);
  try {
    const h = harness();
    await h.demo.openCcxtPosition(h.snapshot);
    const duplicate = await h.demo.openCcxtPosition(h.snapshot);
    assert.match(duplicate.reason, /pending Maker entry/);
    for (const symbol of ["ETH/EUR", "SOL/EUR", "LINK/EUR"])
      await h.demo.openCcxtPosition({ ...h.snapshot, symbol });
    assert.equal(
      h.events.filter((e) => e.action === "MAKER_ENTRY_PENDING").length,
      4,
    );
    for (const symbol of [
      "BTCEUR",
      "ETHEUR",
      "SOLEUR",
      "DOTEUR",
      "ADAEUR",
      "XRPEUR",
    ])
      h.positions.push(Object.assign(storedPosition(), { symbol }));
    const blocked = await h.demo.openCcxtPosition({
      ...h.snapshot,
      symbol: "AVAX/EUR",
    });
    assert.match(blocked.reason, /portfolio exposure limit/);
  } finally {
    clock.mock.restore();
  }
});

test("legacy rows with unknown quantity or non-Spot side cannot manufacture a flat or BUY exit", async () => {
  const clock = mock.method(Date, "now", () => start + H + 10000);
  try {
    for (const bad of ["quantity", "side"]) {
      const h = harness(),
        p = storedPosition();
      if (bad === "quantity") p.quantity = 0;
      else Object.assign(p, { side: "SELL" });
      h.positions.push(p);
      h.bars.push(
        storedBar(start, { open: 101, high: 125, low: 95, close: 121 }),
      );
      const result = await h.demo.checkOpenPositions();
      assert.equal(p.status, "OPEN");
      assert.equal(p.realizedPnlQuote, null);
      assert.equal(h.events.length, 0);
      assert.match(String(result.processed[0].reason), /cost basis/);
    }
  } finally {
    clock.mock.restore();
  }
});

test("reconciliation syncs exposed markets only, caches completed bars and retries failed sync", async () => {
  let reconciled = 0;
  let now = start + 10_000;
  let fail = true;
  const synced: string[] = [];
  const clock = mock.method(Date, "now", () => now);
  try {
    const demo = {
      getOpenPositions: async () => [
        {
          symbol: "BTCEUR",
          timeframe: Timeframe.FOUR_HOURS,
          executionTimeframe: Timeframe.ONE_HOUR,
        },
      ],
      getPendingMakerOrders: async () => [],
      checkOpenPositions: async () => {
        reconciled++;
        return { processed: [] };
      },
    } as unknown as DemoTradingService;
    const data = {
      syncSpotCandles: async (symbol: string, tf: Timeframe) => {
        synced.push(`${symbol}:${tf}`);
        if (fail) throw new Error("offline");
      },
      getLatestClosedCandle: async () => ({
        time: new Date(Math.floor(now / E) * E - E),
      }),
    } as unknown as MarketDataService;
    const scheduler = new DemoTradingScheduler(demo, data);
    await scheduler.handleDemoTradingCycle();
    fail = false;
    await scheduler.handleDemoTradingCycle();
    await scheduler.handleDemoTradingCycle();
    assert.equal(reconciled, 3);
    assert.deepEqual(synced, ["BTCEUR:1h", "BTCEUR:1h"]);
    now += E;
    await scheduler.handleDemoTradingCycle();
    assert.equal(synced.length, 3);
  } finally {
    clock.mock.restore();
  }
});
