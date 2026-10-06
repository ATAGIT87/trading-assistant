import "reflect-metadata";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Timeframe } from "../../src/production/assets/enums/timeframe.enum";
import { MarketDataService } from "../../src/production/market-data/market-data.service";
import {
  MarketDataProviderService,
  SpotCandle,
} from "../../src/production/market-data/market-data-provider.service";
import { MarketCandleStorageService } from "../../src/production/market-data/market-candle-storage.service";
import { MarketCandle } from "../../src/production/market-data/entities/market-candle.entity";
import { DemoPosition } from "../../src/production/demo-trading/entities/demo-position.entity";
import { DemoTradingService } from "../../src/production/demo-trading/demo-trading.service";
import { DemoTradingScheduler } from "../../src/production/demo-trading/demo-trading.scheduler";
import { SignalsService } from "../../src/production/signals/signals.service";
import { StrategyApprovalService } from "../../src/production/strategy-approval/strategy-approval.service";
import { AssetsService } from "../../src/production/assets/assets.service";
import { RiskManagerService } from "../../src/production/risk/risk-manager.service";
import { nextProfitProtectionStop } from "../../src/production/trading/profit-protection";
import { findTradeOutcome } from "../../src/production/trading/trade-outcome";
import { evaluateClosedMarket } from "../../src/production/trading/ccxt/analyze-market";

const hour = +new Date("2026-10-06T10:00:00Z");
const minute = 60_000;
function bar(time: number, values: Partial<SpotCandle> = {}): SpotCandle {
  return {
    time: new Date(time),
    open: 100,
    high: 105,
    low: 95,
    close: 101,
    volume: 1,
    ...values,
  };
}

function harness(
  minutes: SpotCandle[],
  hourly: MarketCandle[] = [],
  openedAt = hour,
) {
  const position = Object.assign(new DemoPosition(), {
    id: 1,
    symbol: "BTCEUR",
    timeframe: Timeframe.ONE_HOUR,
    strategyVersion: "ccxt-ema50-rsi14-v1",
    side: "BUY",
    status: "OPEN",
    mode: "EXPERIMENTAL",
    openedAt: new Date(openedAt),
    entry: 100,
    stopLoss: 90,
    takeProfit: 120,
    quantity: 1,
    investedAmount: 100,
    entryFee: 0.05,
    entrySlippage: 0.05,
    exitFee: 0,
    exitSlippage: 0,
    realizedPnlQuote: null,
  });
  const events: Array<{ action: string }> = [];
  const manager = {
    save: async (_entity: unknown, value: DemoPosition) => value,
    insert: async (_entity: unknown, value: { action: string }) => {
      events.push(value);
    },
  };
  const repository = {
    find: async () => (position.status === "OPEN" ? [position] : []),
    save: async (value: DemoPosition) => value,
    manager: {
      transaction: async (work: (manager: unknown) => Promise<unknown>) =>
        work(manager),
    },
  } as unknown as Repository<DemoPosition>;
  let minuteRequests = 0;
  const provider = {
    getSpotCandles: async (_symbol: string, timeframe: string) => {
      assert.equal(timeframe, "1m");
      minuteRequests++;
      return minutes;
    },
  } as unknown as MarketDataProviderService;
  const storage = {
    getHistoricalCandles: async () => hourly,
  } as unknown as MarketCandleStorageService;
  const market = new MarketDataService(storage, provider);
  const demo = new DemoTradingService(
    repository,
    {} as SignalsService,
    market,
    {} as StrategyApprovalService,
    new ConfigService(),
  );
  return {
    demo,
    market,
    position,
    events,
    minuteRequests: () => minuteRequests,
  };
}

test("a minute stop exits during the first forming hourly candle and keeps gap slippage and costs", async () => {
  const clock = mock.method(Date, "now", () => hour + 2 * minute + 10_000);
  try {
    const h = harness([
      bar(hour),
      bar(hour + minute, { open: 85, high: 110, low: 80, close: 90 }),
      bar(hour + 2 * minute, { high: 999, low: 1 }),
    ]);
    const result = await h.demo.checkOpenPositions();
    assert.equal(result.processed[0].exitCandleTimeframe, "1m");
    assert.equal(h.position.exitReason, "STOP_LOSS");
    assert.equal(h.position.exitPrice, 85);
    assert.equal(+h.position.closedAt!, hour + 2 * minute);
    assert(Math.abs(Number(h.position.realizedPnlQuote) + 15.185) < 1e-9);
    assert.equal(h.events[0].action, "DEMO_CLOSE_PENDING:1");
    await h.demo.checkOpenPositions();
    assert.equal(h.events.length, 1);
  } finally {
    clock.mock.restore();
  }
});

test("minute ordering respects an earlier TP instead of a later SL in the same hour", async () => {
  const clock = mock.method(Date, "now", () => hour + 2 * minute + 10_000);
  try {
    const h = harness([
      bar(hour, { high: 121 }),
      bar(hour + minute, { low: 80 }),
      bar(hour + 2 * minute),
    ]);
    await h.demo.checkOpenPositions();
    assert.equal(h.position.exitReason, "TAKE_PROFIT");
    assert.equal(h.position.exitPrice, 120);
    assert.equal(+h.position.closedAt!, hour + minute);
  } finally {
    clock.mock.restore();
  }
});

test("minute gaps, duplicates, stale data and a mismatched entry never fabricate an exit", async () => {
  const clock = mock.method(Date, "now", () => hour + 2 * minute + 10_000);
  try {
    for (const bars of [
      [bar(hour), bar(hour + 2 * minute)],
      [bar(hour), bar(hour)],
      [bar(hour)],
      [bar(hour, { open: 101 }), bar(hour + minute)],
    ]) {
      const h = harness(bars);
      await assert.rejects(
        () => h.market.getClosedMinuteCandles("BTCEUR", new Date(hour), 100),
        /MINUTE_EXIT_DATA/,
      );
      await h.demo.checkOpenPositions();
      assert.equal(h.position.status, "OPEN");
      assert.equal(h.events.length, 0);
    }
  } finally {
    clock.mock.restore();
  }
});

test("minute monitoring never bridges a missing earlier hourly interval", async () => {
  const clock = mock.method(Date, "now", () => hour + 2 * minute + 10_000);
  try {
    const h = harness(
      [bar(hour, { low: 80 }), bar(hour + minute)],
      [],
      hour - 3_600_000,
    );
    await h.demo.checkOpenPositions();
    assert.equal(h.position.status, "OPEN");
    assert.equal(h.minuteRequests(), 0);
    assert.equal(h.events.length, 0);
  } finally {
    clock.mock.restore();
  }
});

test("exit scheduling is every minute and disabled entry modes do not abandon open positions", async () => {
  const calls: string[] = [];
  const scheduler = new DemoTradingScheduler(
    {
      getOpenPositions: async () => [
        { symbol: "BTCEUR", timeframe: Timeframe.ONE_HOUR },
      ],
      checkOpenPositions: async () => {
        calls.push("exits");
        return { processed: [] };
      },
    } as unknown as DemoTradingService,
    {
      syncSpotCandles: async () => {
        calls.push("sync");
        return 0;
      },
    } as unknown as MarketDataService,
    {
      findActive: async () => {
        throw new Error("Disabled entry modes must not load entry markets.");
      },
    } as unknown as AssetsService,
    new ConfigService({
      DEMO_TRADING_ENABLED: "false",
      EXPLORATORY_DEMO_ENABLED: "false",
    }),
  );
  assert.equal(
    Reflect.getMetadata(
      "SCHEDULE_CRON_OPTIONS",
      scheduler.handleDemoTradingCycle,
    ).cronTime,
    "10 * * * * *",
  );
  await scheduler.handleDemoTradingCycle();
  assert.deepEqual(calls, ["sync", "exits"]);
});

test("EMA50 remains an entry gate and ATR-based risk rejects non-finite or impossible levels", () => {
  const history = Array.from({ length: 60 }, (_, i) => ({
    timestamp: hour - (60 - i) * 3_600_000,
    open: 200 - i,
    high: 201 - i,
    low: 198 - i,
    close: 199 - i,
    volume: 10,
  }));
  const analysis = evaluateClosedMarket(
    "BTCEUR",
    "1h",
    history,
    3_600_000,
    hour,
  );
  assert.equal(analysis.shouldBuy, false);
  assert.equal(analysis.reason, "PRICE_NOT_ABOVE_EMA50");
  const risk = new RiskManagerService();
  const bars = Array.from(
    { length: 10 },
    () => ({ high: "101", low: "99" }) as MarketCandle,
  );
  assert.equal(risk.calculateLevels("BUY", 100, bars, 1).stopLoss, 98.5);
  assert.equal(risk.calculateLevels("BUY", 100, bars, 2).stopLoss, 97);
  for (const [entry, atr] of [
    [NaN, 1],
    [100, Infinity],
    [1, 10],
  ])
    assert.equal(risk.calculateLevels("BUY", entry, bars, atr).stopLoss, null);
});

test("legacy trailing is monotonic and the raised stop applies only to the following bar", () => {
  const first = nextProfitProtectionStop(90, 100, 120, 112, 0.001);
  const second = nextProfitProtectionStop(first, 100, 120, 118, 0.001);
  assert(first > 100 && second >= first);
  assert.equal(nextProfitProtectionStop(second, 100, 120, 113, 0.001), second);
  const result = findTradeOutcome(
    {
      action: "BUY",
      entryPrice: 100,
      stopLoss: 90,
      takeProfit: 120,
      profitProtection: true,
    } as import("../../src/production/signals/signal.types").TradingSignal,
    [
      bar(hour, { high: 115, low: 95, close: 112 }),
      bar(hour + minute, { high: 114, low: 101, close: 110 }),
    ].map((c) => ({
      ...c,
      open: String(c.open),
      high: String(c.high),
      low: String(c.low),
      close: String(c.close),
      volume: String(c.volume),
    })) as MarketCandle[],
    24,
    0.001,
  );
  assert.equal(result.exitIndex, 1);
  assert.equal(result.exitReason, "PROFIT_PROTECTION");
});
