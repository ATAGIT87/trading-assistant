import { Timeframe } from "./enums/timeframe.enum";

export const timeframeDurationMs: Record<Timeframe, number> = {
  [Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
  [Timeframe.ONE_HOUR]: 60 * 60 * 1000,
  [Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
  [Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
};

export const higherTimeframeByTimeframe: Partial<Record<Timeframe, Timeframe>> = {
  [Timeframe.FIFTEEN_MINUTES]: Timeframe.ONE_HOUR,
  [Timeframe.ONE_HOUR]: Timeframe.FOUR_HOURS,
  [Timeframe.FOUR_HOURS]: Timeframe.ONE_DAY,
};

export function getHigherTimeframe(timeframe: Timeframe): Timeframe | null {
  return higherTimeframeByTimeframe[timeframe] ?? null;
}

export function isTimeframeBoundary(timeframe: Timeframe, now: Date): boolean {
  const minutes = now.getUTCMinutes();
  const hours = now.getUTCHours();

  switch (timeframe) {
    case Timeframe.FIFTEEN_MINUTES:
      return minutes % 15 === 0;
    case Timeframe.ONE_HOUR:
      return minutes === 0;
    case Timeframe.FOUR_HOURS:
      return minutes === 0 && hours % 4 === 0;
    case Timeframe.ONE_DAY:
      return minutes === 0 && hours === 0;
  }
}
