import { Timeframe } from "../../assets/enums/timeframe.enum";
import { BacktestSummary } from "./backtest-result.interface";

export interface PortfolioBacktestMember {
  symbol: string;
  totalTrades: number;
  totalR: number;
  expectancyR: number;
  training: BacktestSummary;
  validation: BacktestSummary;
  test: BacktestSummary;
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
    training: BacktestSummary;
    validation: BacktestSummary;
    test: BacktestSummary;
  };
}
