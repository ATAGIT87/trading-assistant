import { StrategyEvidenceTrade } from "./evidence-trade";
import { MarketDataQualityReport } from "../market-data/market-data-quality";

export interface StrategyEvidenceSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
}

export interface StrategyEvidenceContext {
  engineVersion: string;
  /** Absent on legacy evidence; hourly fills cannot approve minute-monitored execution. */
  executionResolution?: "1m" | "15m" | "1h" | "4h" | "1d";
  codeRevision: string;
  feeRate: number;
  slippageRate: number;
  protectedHoldoutStart: string;
  primaryCandleRange: {
    firstCandleTime: Date | null;
    lastCompletedCandleTime: Date | null;
  };
}

export interface StrategyEvidenceResult {
  strategyVersion: string;
  researchContext: StrategyEvidenceContext;
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

  training: StrategyEvidenceSummary;
  validation: StrategyEvidenceSummary;
  test: StrategyEvidenceSummary;
  protectedHoldout: StrategyEvidenceSummary | null;

  trades: StrategyEvidenceTrade[];

  totalFeeR: number;
  totalSlippageR: number;
}
