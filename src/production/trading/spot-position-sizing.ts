export type SpotPositionSize = {
  quantity: number;
  investedAmount: number;
  riskBudgetQuote: number;
  plannedRiskQuote: number;
};

/** Sizes a long Spot position from account risk, with an explicit spend cap. */
export function calculateSpotPositionSize(
  entry: number,
  stopLoss: number,
  availableQuoteBalance: number,
  riskPerTradePercent: number,
  maximumInvestedAmount: number,
  costRate = 0,
): SpotPositionSize | null {
  const riskPerUnit = entry - stopLoss + (entry + stopLoss) * costRate;
  if (
    ![
      entry,
      stopLoss,
      availableQuoteBalance,
      riskPerTradePercent,
      maximumInvestedAmount,
      costRate,
    ].every(Number.isFinite) ||
    entry <= 0 ||
    stopLoss <= 0 ||
    stopLoss >= entry ||
    costRate < 0 ||
    riskPerUnit <= 0 ||
    availableQuoteBalance <= 0 ||
    riskPerTradePercent <= 0 ||
    riskPerTradePercent > 1 ||
    maximumInvestedAmount <= 0
  ) {
    return null;
  }

  const riskBudgetQuote = availableQuoteBalance * riskPerTradePercent;
  const maximumSpend = Math.min(availableQuoteBalance, maximumInvestedAmount);
  const rawQuantity = Math.min(
    riskBudgetQuote / riskPerUnit,
    maximumSpend / (entry * (1 + costRate)),
  );
  // Match the database quantity precision without rounding spend above its cap.
  const quantity = Math.floor(rawQuantity * 1e8) / 1e8;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  return {
    quantity,
    investedAmount: quantity * entry,
    riskBudgetQuote,
    plannedRiskQuote: quantity * riskPerUnit,
  };
}
