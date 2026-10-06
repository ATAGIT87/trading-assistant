import { Timeframe } from "../assets/enums/timeframe.enum";
import { timeframeDurationMs } from "../assets/timeframe.utils";
import { MarketCandle } from "./entities/market-candle.entity";

export interface MarketDataQualityReport {
  symbol: string;
  timeframe: Timeframe;
  totalCandles: number;
  completedCandles: number;
  firstCandleTime: Date | null;
  lastCompletedCandleTime: Date | null;
  invalidOhlcCandles: number;
  gapCount: number;
  duplicateCandles: number;
  misalignedCandles: number;
  invalidTimestamps: number;
  largestGapCandles: number;
  isFresh: boolean;
  isUsableForResearch: boolean;
  reason: string;
}

/**
 * Public exchange history can contain market-wide outages. Backtests must not
 * bridge those intervals: use only the newest continuous suffix and retain its
 * start time in the quality report.
 */
export function getLatestContinuousCandleSegment(
  candles: MarketCandle[],
  timeframe: Timeframe,
): MarketCandle[] {
  const duration = timeframeDurationMs[timeframe];
  const sorted = [...candles].sort(
    (left, right) => left.time.getTime() - right.time.getTime(),
  );
  let startIndex = 0;
  for (let index = 1; index < sorted.length; index++) {
    if (
      sorted[index].time.getTime() - sorted[index - 1].time.getTime() >
      duration
    ) {
      startIndex = index;
    }
  }
  return sorted.slice(startIndex);
}

/** Pure data-quality gate: it deliberately does not infer that a clean series is profitable. */
export function assessMarketDataQuality(
  symbol: string,
  timeframe: Timeframe,
  candles: MarketCandle[],
  now = new Date(),
  minimumCompletedCandles = 200,
): MarketDataQualityReport {
  const duration = timeframeDurationMs[timeframe];
  const sorted = [...candles].sort(
    (left, right) => left.time.getTime() - right.time.getTime(),
  );
  const invalidTimestamps = sorted.filter(
    (c) => !Number.isFinite(c.time.getTime()),
  ).length;
  const completed = sorted.filter(
    (candle) => candle.time.getTime() + duration <= now.getTime(),
  );
  const invalidOhlcCandles = completed.filter((candle) => {
    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume);
    return (
      ![open, high, low, close, volume].every(Number.isFinite) ||
      low > Math.min(open, close) ||
      high < Math.max(open, close) ||
      low <= 0 ||
      high < low ||
      volume < 0
    );
  }).length;

  const misalignedCandles = completed.filter(
    (c) => c.time.getTime() % duration !== 0,
  ).length;
  let duplicateCandles = 0;
  let gapCount = 0;
  let largestGapCandles = 0;
  for (let index = 1; index < completed.length; index++) {
    const elapsed =
      completed[index].time.getTime() - completed[index - 1].time.getTime();
    if (elapsed === 0) duplicateCandles++;
    if (elapsed > duration) {
      gapCount++;
      largestGapCandles = Math.max(
        largestGapCandles,
        Math.round(elapsed / duration) - 1,
      );
    }
  }

  const latest = completed.at(-1) ?? null;
  const isFresh =
    latest !== null &&
    latest.time.getTime() ===
      Math.floor(now.getTime() / duration) * duration - duration;
  const isUsableForResearch =
    completed.length >= minimumCompletedCandles &&
    invalidOhlcCandles === 0 &&
    gapCount === 0 &&
    duplicateCandles === 0 &&
    misalignedCandles === 0 &&
    invalidTimestamps === 0;
  const reason = !isUsableForResearch
    ? `Research blocked: require at least ${minimumCompletedCandles} completed candles with valid OHLC/time values, aligned timestamps, no duplicates and no gaps.`
    : !isFresh
      ? "Historical research data is usable, but the latest completed candle is stale for live monitoring."
      : "Data series is continuous, valid, and fresh.";

  return {
    symbol,
    timeframe,
    totalCandles: sorted.length,
    completedCandles: completed.length,
    firstCandleTime: completed[0]?.time ?? null,
    lastCompletedCandleTime: latest?.time ?? null,
    invalidOhlcCandles,
    gapCount,
    duplicateCandles,
    misalignedCandles,
    invalidTimestamps,
    largestGapCandles,
    isFresh,
    isUsableForResearch,
    reason,
  };
}
