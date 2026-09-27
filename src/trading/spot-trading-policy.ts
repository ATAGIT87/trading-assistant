import { SignalAction, TradingSignal } from "../signals/signal.types";

/**
 * The application currently consumes Binance Spot candles and does not model
 * borrowing, margin, or perpetual-futures liquidation. Therefore a SELL can
 * never be an opening instruction; it can only be an exit managed by an
 * already-open long position's SL/TP.
 */
export function isAllowedSpotEntry(action: SignalAction): action is "BUY" {
  return action === "BUY";
}

export function enforceSpotEntryPolicy(signal: TradingSignal): TradingSignal {
  if (signal.action !== "SELL") {
    return signal;
  }

  return {
    ...signal,
    action: "NO_TRADE",
    stopLoss: null,
    takeProfit: null,
    isStrongSetup: false,
    reason:
      "NO_TRADE: opening a SELL/short position is not supported in Spot mode.",
  };
}
