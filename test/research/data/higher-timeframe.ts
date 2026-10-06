import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";

const higherTimeframe: Partial<Record<Timeframe, Timeframe>> = {
  [Timeframe.FIFTEEN_MINUTES]: Timeframe.ONE_HOUR,
  [Timeframe.ONE_HOUR]: Timeframe.FOUR_HOURS,
  [Timeframe.FOUR_HOURS]: Timeframe.ONE_DAY,
};

export function getHigherTimeframe(timeframe: Timeframe): Timeframe | null {
  return higherTimeframe[timeframe] ?? null;
}
