import { StrategyEvidenceTrade } from "./evidence-trade";

export function applyPortfolioCapacity(
  trades: StrategyEvidenceTrade[],
  maxOpenPositions: number,
): StrategyEvidenceTrade[] {
  const accepted: StrategyEvidenceTrade[] = [];
  const activeUntil: number[] = [];
  for (const trade of [...trades].sort(
    (a, b) =>
      toTimestamp(a.time) - toTimestamp(b.time) ||
      a.symbol.localeCompare(b.symbol),
  )) {
    const entryTime = toTimestamp(trade.time);
    while (activeUntil.length > 0 && activeUntil[0] <= entryTime)
      activeUntil.shift();
    if (activeUntil.length >= maxOpenPositions) continue;
    accepted.push(trade);
    activeUntil.push(
      trade.exitTime === null ? Infinity : toTimestamp(trade.exitTime),
    );
    activeUntil.sort((a, b) => a - b);
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
