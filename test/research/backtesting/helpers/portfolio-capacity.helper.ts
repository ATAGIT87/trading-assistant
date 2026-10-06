import { StrategyEvidenceTrade } from "../../../../src/production/strategy-approval/evidence-trade";
import { calculateBacktestSummary } from "./backtest-summary.helper";

import { applyPortfolioCapacity } from "../../../../src/production/strategy-approval/evidence-capacity";
export { applyPortfolioCapacity } from "../../../../src/production/strategy-approval/evidence-capacity";

export function summarizeCapacityConstrainedSegment(
  trades: StrategyEvidenceTrade[],
  maxOpenPositions: number,
) {
  const accepted = applyPortfolioCapacity(trades, maxOpenPositions);
  return { accepted, summary: calculateBacktestSummary(accepted) };
}
