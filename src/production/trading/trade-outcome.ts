import { FOUR_HOURS_MS } from "./ccxt/analyze-market";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";
import { advanceMakerPosition, initialMakerPosition } from "./maker-execution";

/** Full-history replay keeps initial SL immutable and reconstructs Maker/BE state across restarts. */
export function findTradeOutcome(
  signal: TradingSignal,
  candles: MarketCandle[],
  durationMs = FOUR_HOURS_MS,
) {
  if (
    signal.executionPolicy !== "MAKER_ONLY" ||
    signal.action !== "BUY" ||
    signal.stopLoss === null ||
    signal.takeProfit === null
  )
    throw new Error("ONLY_MAKER_SPOT_OUTCOMES_ALLOWED");
  const risk = signal.entryPrice - signal.stopLoss;
  let state = initialMakerPosition(signal, +candles[0]?.time || 0),
    maeR = 0,
    mfeR = 0;
  for (const [index, candle] of candles.entries()) {
    maeR = Math.max(maeR, (signal.entryPrice - Number(candle.low)) / risk);
    mfeR = Math.max(mfeR, (Number(candle.high) - signal.entryPrice) / risk);
    const step = advanceMakerPosition(signal, state, candle, durationMs);
    state = step.state;
    if (step.exitPrice !== null)
      return {
        exitIndex: index,
        exitPrice: step.exitPrice,
        exitReason: step.exitReason,
        exitSlippagePerUnit: step.exitSlippagePerUnit ?? 0,
        durationCandles: index + 1,
        maeR,
        mfeR,
        activeStopLoss: state.activeStop,
        pendingStopLimit: state.stopLimit,
      };
  }
  return {
    exitIndex: null,
    exitPrice: null,
    exitReason: null,
    exitSlippagePerUnit: 0,
    durationCandles: candles.length,
    maeR,
    mfeR,
    activeStopLoss: state.activeStop,
    pendingStopLimit: state.stopLimit,
  };
}
