import { MarketCandle } from "../../market-data/entities/market-candle.entity";
import { TradingSignal } from "../../signals/signal.types";

export type ExecutableSignal = TradingSignal & {
  action: "BUY" | "SELL";
  stopLoss: number;
  takeProfit: number;
};

/**
 * A signal is known only after its candle closes. Model a market entry at the
 * next candle's open and reject gaps that would make its planned SL/TP invalid.
 */
export function executeSignalAtNextOpen(
  signal: TradingSignal,
  nextCandle: Pick<MarketCandle, "open">,
): ExecutableSignal | null {
  if (
    (signal.action !== "BUY" && signal.action !== "SELL") ||
    signal.stopLoss === null ||
    signal.takeProfit === null
  ) {
    return null;
  }

  const entryPrice = Number(nextCandle.open);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return null;
  }

  const validBuy =
    signal.action === "BUY" &&
    entryPrice > signal.stopLoss &&
    entryPrice < signal.takeProfit;
  const validSell =
    signal.action === "SELL" &&
    entryPrice < signal.stopLoss &&
    entryPrice > signal.takeProfit;

  if (!validBuy && !validSell) {
    return null;
  }

  return { ...signal, entryPrice } as ExecutableSignal;
}
