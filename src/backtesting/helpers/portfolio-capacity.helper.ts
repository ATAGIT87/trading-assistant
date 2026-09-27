import { BacktestTrade } from "../interfaces/backtest-trade.interface";
import { calculateBacktestSummary } from "./backtest-summary.helper";

export function applyPortfolioCapacity(
  trades: BacktestTrade[],
  maxOpenPositions: number,
): BacktestTrade[] {
  const accepted: BacktestTrade[] = [];
  const activeUntil: Date[] = [];
  for (const trade of [...trades].sort(
    (a, b) =>
      toTimestamp(a.time) - toTimestamp(b.time) ||
      a.symbol.localeCompare(b.symbol),
  )) {
    const entryTime = toTimestamp(trade.time);
    while (activeUntil.length > 0 && activeUntil[0].getTime() < entryTime)
      activeUntil.shift();
    if (activeUntil.length >= maxOpenPositions) continue;
    accepted.push(trade);
    activeUntil.push(
      trade.exitTime === null
        ? new Date(Number.MAX_SAFE_INTEGER)
        : new Date(toTimestamp(trade.exitTime)),
    );
    activeUntil.sort((a, b) => a.getTime() - b.getTime());
  }
  return accepted;
}

/** TypeORM JSON columns return Dates as ISO strings after a database read. */
function toTimestamp(value: Date | string): number {
  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error(
      "Portfolio capacity received a trade with an invalid timestamp.",
    );
  }
  return timestamp;
}

export function summarizeCapacityConstrainedSegment(
  trades: BacktestTrade[],
  maxOpenPositions: number,
) {
  const accepted = applyPortfolioCapacity(trades, maxOpenPositions);
  return { accepted, summary: calculateBacktestSummary(accepted) };
}
