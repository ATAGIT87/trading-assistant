export interface WalkForwardWindow {
  index: number;
  startIndex: number;
  endIndex: number;
}

/** Consecutive forward-only evaluation windows after a fixed warm-up period. */
export function buildWalkForwardWindows(
  candleCount: number,
  warmupCandles: number,
  folds = 3,
): WalkForwardWindow[] {
  const firstIndex = Math.max(0, warmupCandles);
  const available = candleCount - firstIndex;
  if (folds < 1 || available < folds) {
    return [];
  }

  const baseSize = Math.floor(available / folds);
  return Array.from({ length: folds }, (_, index) => ({
    index: index + 1,
    startIndex: firstIndex + index * baseSize,
    endIndex:
      index === folds - 1 ? candleCount : firstIndex + (index + 1) * baseSize,
  }));
}
