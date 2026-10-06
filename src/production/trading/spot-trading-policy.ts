import { SignalAction } from "../signals/signal.types";

/**
 * The application currently consumes Kraken Spot candles and does not model
 * borrowing, margin, or perpetual-futures liquidation. Therefore a SELL can
 * never be an opening instruction; it can only be an exit managed by an
 * already-open long position's SL/TP.
 */
export function isAllowedSpotEntry(action: SignalAction): action is "BUY" {
  return action === "BUY";
}
