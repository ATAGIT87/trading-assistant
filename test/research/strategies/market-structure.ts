export type PriceCandle = {
  high: number;
  low: number;
};

/** Broken confirmed highs are retired; wick touches alone do not break a level. */
export function findUnbrokenSwingHighs(
  candles: (PriceCandle & { close: number })[],
  radius = 2,
): number[] {
  if (!Number.isInteger(radius) || radius < 1) {
    throw new Error("Swing radius must be a positive integer.");
  }
  const levels: number[] = [];
  for (let i = radius; i < candles.length - radius; i++) {
    const level = candles[i].high;
    const confirmed = candles
      .slice(i - radius, i + radius + 1)
      .every((candle) => candle.high <= level);
    if (
      confirmed &&
      !candles.slice(i + radius + 1).some((candle) => candle.close > level)
    )
      levels.push(level);
  }
  return levels;
}

/**
 * A pivot is only usable after the candles to its right have closed. This
 * keeps support/resistance detection free of look-ahead bias.
 */
export function findConfirmedSwingHighs(
  candles: PriceCandle[],
  radius = 2,
): number[] {
  return findConfirmedSwings(candles, "high", radius);
}

export function findNearestResistanceAbove(
  swingHighs: number[],
  price: number,
): number | null {
  const levels = swingHighs.filter((level) => level > price);
  return levels.length === 0 ? null : Math.min(...levels);
}

function findConfirmedSwings(
  candles: PriceCandle[],
  field: "high" | "low",
  radius: number,
): number[] {
  if (!Number.isInteger(radius) || radius < 1) {
    throw new Error("Swing radius must be a positive integer.");
  }
  const swings: number[] = [];
  for (let index = radius; index < candles.length - radius; index++) {
    const value = candles[index][field];
    const neighbours = candles.slice(index - radius, index + radius + 1);
    const isSwing =
      field === "high"
        ? neighbours.every((candle) => candle.high <= value)
        : neighbours.every((candle) => candle.low >= value);
    if (isSwing) swings.push(value);
  }
  return swings;
}
