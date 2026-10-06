import { Timeframe } from "./enums/timeframe.enum";

export const timeframeDurationMs: Record<Timeframe, number> = {
  [Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
  [Timeframe.ONE_HOUR]: 60 * 60 * 1000,
  [Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
  [Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
};
