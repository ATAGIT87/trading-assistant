import { findTradeOutcome } from "./backtest-outcome.helper";

function makeCandle(high: number, low: number) {
  return {
    high,
    low,
    open: 0,
    close: 0,
    time: new Date(),
    symbol: "BTCUSDT",
    timeframe: "15m",
  } as any;
}

describe("findTradeOutcome", () => {
  it("treats a same-candle stop-loss and take-profit hit as a loss for BUY", () => {
    const signal = {
      action: "BUY",
      confidence: 80,
      entryPrice: 100,
      stopLoss: 95,
      takeProfit: 105,
      isStrongSetup: true,
      trend: "BULLISH",
      rsi: 55,
      adx: 30,
      rsiStatus: "NEUTRAL",
      marketCondition: "BULLISH_CONTINUATION",
      candleTime: new Date(),
      reason: "test",
    } as any;

    const futureCandles = [makeCandle(110, 90)];

    const outcome = findTradeOutcome(signal, futureCandles, 48);

    expect(outcome.result).toBe(false);
    expect(outcome.exitIndex).toBe(0);
    expect(outcome.exitPrice).toBe(95);
  });

  it("treats a same-candle stop-loss and take-profit hit as a loss for SELL", () => {
    const signal = {
      action: "SELL",
      confidence: 80,
      entryPrice: 100,
      stopLoss: 105,
      takeProfit: 95,
      isStrongSetup: true,
      trend: "BEARISH",
      rsi: 45,
      adx: 32,
      rsiStatus: "NEUTRAL",
      marketCondition: "BEARISH_CONTINUATION",
      candleTime: new Date(),
      reason: "test",
    } as any;

    const futureCandles = [makeCandle(110, 90)];

    const outcome = findTradeOutcome(signal, futureCandles, 48);

    expect(outcome.result).toBe(false);
    expect(outcome.exitIndex).toBe(0);
    expect(outcome.exitPrice).toBe(105);
  });

  it("closes at the configured time limit using the candle close", () => {
    const signal = {
      action: "BUY",
      entryPrice: 100,
      stopLoss: 95,
      takeProfit: 110,
    } as any;
    const candle = { ...makeCandle(104, 99), close: 103 };

    expect(findTradeOutcome(signal, [candle], 1)).toMatchObject({
      result: true,
      exitReason: "TIME_EXIT",
      exitIndex: 0,
      exitPrice: 103,
    });
  });
});
