import { MarketCandle } from "../../../../src/production/market-data/entities/market-candle.entity";
import { TradingSignal } from "../../../../src/production/signals/signal.types";
import {
  rebaseSignalAtEntry,
  ExecutableSignal,
} from "../../../../src/production/trading/trade-execution";

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

  return rebaseSignalAtEntry(signal, entryPrice);
}
