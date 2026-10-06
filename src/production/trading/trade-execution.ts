import { TradingSignal } from "../signals/signal.types";

export type ExecutableSignal = TradingSignal & {
  action: "BUY" | "SELL";
  stopLoss: number;
  takeProfit: number;
};

/**
 * Keep the structural stop from the closed-candle setup, but calculate the
 * target from the price actually available at the next candle's open.
 *
 * Without this, a favourable overnight/next-candle gap can accidentally turn
 * a planned 2R trade into a much more distant target (for example 3.3R).
 */
export function rebaseSignalAtEntry(
  signal: TradingSignal,
  entryPrice: number,
): ExecutableSignal | null {
  if (
    (signal.action !== "BUY" && signal.action !== "SELL") ||
    signal.stopLoss === null ||
    signal.takeProfit === null ||
    signal.stopLoss <= 0 ||
    signal.takeProfit <= 0 ||
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0
  ) {
    return null;
  }

  const plannedRisk = Math.abs(signal.entryPrice - signal.stopLoss);
  const plannedReward = Math.abs(signal.takeProfit - signal.entryPrice);
  const rewardToRisk = plannedReward / plannedRisk;
  const actualRisk = Math.abs(entryPrice - signal.stopLoss);
  if (
    !Number.isFinite(rewardToRisk) ||
    rewardToRisk <= 0 ||
    !Number.isFinite(actualRisk) ||
    actualRisk <= 0
  ) {
    return null;
  }

  const maximumStopDistanceFraction = signal.maximumStopDistanceFraction;
  if (
    maximumStopDistanceFraction !== undefined &&
    (!Number.isFinite(maximumStopDistanceFraction) ||
      maximumStopDistanceFraction <= 0 ||
      actualRisk / entryPrice > maximumStopDistanceFraction)
  )
    return null;

  const validLevels =
    signal.action === "BUY"
      ? signal.stopLoss < signal.entryPrice &&
        signal.takeProfit > signal.entryPrice &&
        entryPrice > signal.stopLoss &&
        entryPrice < signal.takeProfit
      : signal.stopLoss > signal.entryPrice &&
        signal.takeProfit < signal.entryPrice &&
        entryPrice < signal.stopLoss &&
        entryPrice > signal.takeProfit;
  if (!validLevels) return null;

  const rebasedTarget = signal.preserveTakeProfit
    ? signal.takeProfit
    : signal.action === "BUY"
      ? entryPrice + actualRisk * rewardToRisk
      : entryPrice - actualRisk * rewardToRisk;
  const limit = signal.takeProfitLimit;
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0))
    return null;
  const takeProfit =
    limit === undefined
      ? rebasedTarget
      : signal.action === "BUY"
        ? Math.min(rebasedTarget, limit)
        : Math.max(rebasedTarget, limit);
  const actualReward =
    signal.action === "BUY" ? takeProfit - entryPrice : entryPrice - takeProfit;
  const minimumRewardRisk = signal.minimumRewardRisk ?? 0;
  if (
    !Number.isFinite(takeProfit) ||
    takeProfit <= 0 ||
    actualReward <= 0 ||
    !Number.isFinite(minimumRewardRisk) ||
    minimumRewardRisk < 0 ||
    actualReward / actualRisk + 1e-12 < minimumRewardRisk
  )
    return null;

  return { ...signal, entryPrice, takeProfit } as ExecutableSignal;
}

/** Same costs as the Demo ledger and backtest; never raise TP to cover fees. */
export function hasPositiveNetTarget(
  signal: ExecutableSignal,
  feeRate: number,
  slippageRate: number,
): boolean {
  if (
    ![feeRate, slippageRate].every((rate) => Number.isFinite(rate) && rate >= 0)
  )
    return false;
  const reward =
    signal.action === "BUY"
      ? signal.takeProfit - signal.entryPrice
      : signal.entryPrice - signal.takeProfit;
  const netReward =
    reward - (signal.entryPrice + signal.takeProfit) * (feeRate + slippageRate);
  const minimumNetR = signal.minimumNetRewardRisk ?? 0;
  const risk = Math.abs(signal.entryPrice - signal.stopLoss);
  return (
    Number.isFinite(minimumNetR) &&
    minimumNetR >= 0 &&
    netReward > 0 &&
    risk > 0 &&
    netReward / risk + 1e-12 >= minimumNetR
  );
}
