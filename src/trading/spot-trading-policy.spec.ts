import {
  enforceSpotEntryPolicy,
  isAllowedSpotEntry,
} from "./spot-trading-policy";
import { TradingSignal } from "../signals/signal.types";

describe("Spot trading policy", () => {
  const sellSignal: TradingSignal = {
    action: "SELL",
    confidence: 80,
    entryPrice: 100,
    stopLoss: 110,
    takeProfit: 80,
    isStrongSetup: true,
    trend: "BEARISH",
    rsi: 30,
    adx: 25,
    rsiStatus: "NEUTRAL",
    marketCondition: "BEARISH_CONTINUATION",
    candleTime: new Date("2025-01-01T00:00:00.000Z"),
    reason: "test",
  };

  it("allows only BUY entries", () => {
    expect(isAllowedSpotEntry("BUY")).toBe(true);
    expect(isAllowedSpotEntry("SELL")).toBe(false);
    expect(isAllowedSpotEntry("NO_TRADE")).toBe(false);
  });

  it("converts a short-entry signal into no trade", () => {
    expect(enforceSpotEntryPolicy(sellSignal)).toMatchObject({
      action: "NO_TRADE",
      stopLoss: null,
      takeProfit: null,
      isStrongSetup: false,
    });
  });
});
