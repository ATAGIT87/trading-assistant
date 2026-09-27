import { executeSignalAtNextOpen } from "./backtest-execution.helper";

const buySignal = {
  action: "BUY" as const,
  entryPrice: 100,
  stopLoss: 95,
  takeProfit: 110,
  confidence: 80,
  isStrongSetup: true,
  trend: "BULLISH" as const,
  rsi: 50,
  adx: 25,
  rsiStatus: "NEUTRAL" as const,
  marketCondition: "BULLISH_CONTINUATION" as const,
  candleTime: new Date(),
  reason: "test",
};

describe("executeSignalAtNextOpen", () => {
  it("fills a valid signal at the next candle open", () => {
    expect(executeSignalAtNextOpen(buySignal, { open: "101" })).toMatchObject({
      entryPrice: 101,
    });
  });

  it("rejects a gap that crosses the planned stop or target", () => {
    expect(executeSignalAtNextOpen(buySignal, { open: "94" })).toBeNull();
    expect(executeSignalAtNextOpen(buySignal, { open: "111" })).toBeNull();
  });
});
