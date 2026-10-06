import { Timeframe } from "../../../../src/production/assets/enums/timeframe.enum";
import { StrategyEvidenceSummary } from "../../../../src/production/strategy-approval/evidence-result";

export interface WalkForwardFoldResult {
  fold: number;
  startsAt: Date;
  endsAt: Date;
  aggregate: StrategyEvidenceSummary & { benchmarkBuyAndHoldReturnPct: number };
  bySymbol: Array<{
    symbol: string;
    summary: StrategyEvidenceSummary;
    benchmarkBuyAndHoldReturnPct: number;
  }>;
}

/** Fixed-rule, forward-only research result. It cannot authorize Demo trading. */
export interface WalkForwardPortfolioResult {
  strategyVersion: string;
  timeframe: Timeframe;
  includesProtectedHoldout: false;
  folds: WalkForwardFoldResult[];
}
