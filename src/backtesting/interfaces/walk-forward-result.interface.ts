import { Timeframe } from "../../assets/enums/timeframe.enum";
import { BacktestSummary } from "./backtest-result.interface";

export interface WalkForwardFoldResult {
  fold: number;
  startsAt: Date;
  endsAt: Date;
  aggregate: BacktestSummary & { benchmarkBuyAndHoldReturnPct: number };
  bySymbol: Array<{
    symbol: string;
    summary: BacktestSummary;
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
