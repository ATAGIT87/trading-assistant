import { Timeframe } from "../../../../src/production/assets/enums/timeframe.enum";
import { StrategyEvidenceSummary } from "../../../../src/production/strategy-approval/evidence-result";

export interface PortfolioBacktestMember {
  symbol: string;
  totalTrades: number;
  totalR: number;
  expectancyR: number;
  training: StrategyEvidenceSummary;
  validation: StrategyEvidenceSummary;
  test: StrategyEvidenceSummary;
}

/** Research-only aggregate; it is deliberately not a Demo approval result. */
export interface PortfolioBacktestResult {
  strategyVersion: string;
  timeframe: Timeframe;
  includesProtectedHoldout: false;
  members: PortfolioBacktestMember[];
  aggregate: {
    totalTrades: number;
    totalR: number;
    expectancyR: number;
    grossTotalR: number;
    totalFeeR: number;
    totalSlippageR: number;
    totalCostR: number;
    training: StrategyEvidenceSummary;
    validation: StrategyEvidenceSummary;
    test: StrategyEvidenceSummary;
  };
}
