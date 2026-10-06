/** A close can raise tomorrow's/hour's stop, never the stop inside that same bar. */
export function nextProfitProtectionStop(
  currentStop: number,
  entry: number,
  target: number,
  close: number,
  exitCostRate: number,
  entryCostPerUnit = entry * exitCostRate,
): number {
  const distance = target - entry;
  if (
    ![currentStop, entry, target, close, exitCostRate, entryCostPerUnit].every(
      Number.isFinite,
    ) ||
    distance <= 0 ||
    exitCostRate < 0 ||
    exitCostRate >= 1 ||
    entryCostPerUnit < 0 ||
    close < entry + distance * 0.5
  )
    return currentStop;
  const netBreakeven = (entry + entryCostPerUnit) / (1 - exitCostRate);
  const floor = netBreakeven + distance * 0.1;
  const candidate = Math.max(floor, close - distance * 0.5);
  return candidate < close ? Math.max(currentStop, candidate) : currentStop;
}
