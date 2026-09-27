import { Timeframe } from "../../assets/enums/timeframe.enum";
import { BacktestResult } from "../interfaces/backtest-result.interface";
import { aggregatePortfolioBacktests } from "./portfolio-backtest.helper";

function result(overrides: Partial<BacktestResult>): BacktestResult {
  return {
    strategyVersion: "candidate",
    totalTrades: 3,
    totalR: 1,
    expectancyR: 1 / 3,
    grossTotalR: 1.4,
    totalFeeR: 0.2,
    totalSlippageR: 0.2,
    totalCostR: 0.4,
    training: {
      totalTrades: 1,
      winningTrades: 1,
      losingTrades: 0,
      winRate: 100,
      totalR: 1,
      expectancyR: 1,
    },
    validation: {
      totalTrades: 1,
      winningTrades: 0,
      losingTrades: 1,
      winRate: 0,
      totalR: -1,
      expectancyR: -1,
    },
    test: {
      totalTrades: 1,
      winningTrades: 1,
      losingTrades: 0,
      winRate: 100,
      totalR: 1,
      expectancyR: 1,
    },
    trades: [
      {
        symbol: "BTCUSDT",
        segment: "training",
        time: new Date("2020-01-01"),
        exitTime: new Date("2020-01-01T01:00:00Z"),
        action: "BUY",
        result: "WIN",
        grossR: 1.4,
        feeR: 0.2,
        slippageR: 0.2,
        resultR: 1,
      },
      {
        symbol: "BTCUSDT",
        segment: "validation",
        time: new Date("2020-01-02"),
        exitTime: new Date("2020-01-02T01:00:00Z"),
        action: "BUY",
        result: "LOSS",
        grossR: -0.6,
        feeR: 0.2,
        slippageR: 0.2,
        resultR: -1,
      },
      {
        symbol: "BTCUSDT",
        segment: "test",
        time: new Date("2020-01-03"),
        exitTime: new Date("2020-01-03T01:00:00Z"),
        action: "BUY",
        result: "WIN",
        grossR: 1.4,
        feeR: 0.2,
        slippageR: 0.2,
        resultR: 1,
      },
    ] as any,
    ...overrides,
  } as BacktestResult;
}

describe("aggregatePortfolioBacktests", () => {
  it("combines segments and costs without approving a live strategy", () => {
    const aggregate = aggregatePortfolioBacktests(Timeframe.ONE_HOUR, [
      { symbol: "BTCUSDT", result: result({}) },
      { symbol: "ETHUSDT", result: result({ totalR: 2, grossTotalR: 2.4 }) },
    ]);

    expect(aggregate.includesProtectedHoldout).toBe(false);
    expect(aggregate.aggregate.totalTrades).toBe(3);
    expect(aggregate.aggregate.totalR).toBe(1);
    expect(aggregate.aggregate.grossTotalR).toBeCloseTo(2.2);
    expect(aggregate.aggregate.totalCostR).toBeCloseTo(1.2);
    expect(aggregate.aggregate.validation.totalTrades).toBe(1);
  });
});
