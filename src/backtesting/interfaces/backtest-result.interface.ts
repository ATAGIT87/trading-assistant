import { BacktestTrade } from "./backtest-trade.interface";
import { MarketDataQualityReport } from "../../market-data/market-data-quality";

export interface BacktestSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
}

export interface BacktestResearchContext {
  engineVersion: string;
  codeRevision: string;
  feeRate: number;
  slippageRate: number;
  protectedHoldoutStart: string;
  primaryCandleRange: {
    firstCandleTime: Date | null;
    lastCompletedCandleTime: Date | null;
  };
}

export interface BacktestResult {
  strategyVersion: string;
  researchContext: BacktestResearchContext;
  dataQuality: {
    primary: MarketDataQualityReport;
    higherTimeframe: MarketDataQualityReport | null;
  };
  higherTimeframeConfirmation: boolean;
  includesProtectedHoldout: boolean;
  protectedHoldoutDays: number;
  entryTrades: number;
  entryWins: number;
  entryLosses: number;
  entryTotalR: number;
  winAverageRsi: number;
  lossAverageRsi: number;
  winAverageAdx: number;
  lossAverageAdx: number;

  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;

  grossTotalR: number;
  totalCostR: number;

  winAverageMaeR: number;
  winAverageMfeR: number;
  winAverageDurationCandles: number;

  lossAverageMaeR: number;
  lossAverageMfeR: number;
  lossAverageDurationCandles: number;

  lossMfeAtLeast1R: number;
  lossMfeAtLeast2R: number;

  training: BacktestSummary;
  validation: BacktestSummary;
  test: BacktestSummary;
  protectedHoldout: BacktestSummary | null;

  trades: BacktestTrade[];

  totalFeeR: number;
  totalSlippageR: number;
}
