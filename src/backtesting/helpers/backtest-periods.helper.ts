import { MarketCandle } from "../../market-data/entities/market-candle.entity";

export interface BacktestPeriods {
  trainingEndIndex: number;
  validationEndIndex: number;
  selectionTestEndIndex: number;
  protectedHoldoutStartIndex: number | null;
}

/** Keeps the final holdout out of every design and selection period. */
export function buildBacktestPeriods(
  candles: MarketCandle[],
  protectedHoldoutStart: Date,
  includeProtectedHoldout: boolean,
): BacktestPeriods {
  const foundHoldoutIndex = candles.findIndex(
    (candle) => candle.time >= protectedHoldoutStart,
  );
  const protectedHoldoutStartIndex = includeProtectedHoldout
    ? foundHoldoutIndex === -1
      ? candles.length
      : foundHoldoutIndex
    : null;
  const selectionTestEndIndex = protectedHoldoutStartIndex ?? candles.length;

  return {
    trainingEndIndex: Math.floor(selectionTestEndIndex * 0.6),
    validationEndIndex: Math.floor(selectionTestEndIndex * 0.8),
    selectionTestEndIndex,
    protectedHoldoutStartIndex,
  };
}
