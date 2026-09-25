import { BacktestTrade } from "./backtest-trade.interface";

export interface BacktestSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
}

export interface BacktestResult {
  strategyVersion: string;
  higherTimeframeConfirmation: boolean;
  sellAdxBelow25Trades: number;
  sellAdxBelow25Wins: number;
  sellAdxBelow25R: number;

  sellAdx25To30Trades: number;
  sellAdx25To30Wins: number;
  sellAdx25To30R: number;

  sellAdx30To35Trades: number;
  sellAdx30To35Wins: number;
  sellAdx30To35R: number;

  sellAdx35To40Trades: number;
  sellAdx35To40Wins: number;
  sellAdx35To40R: number;

  sellAdxAbove40Trades: number;
  sellAdxAbove40Wins: number;
  sellAdxAbove40R: number;

  sellWinAverageRsi: number;
  sellLossAverageRsi: number;
  sellWinAverageAdx: number;
  sellLossAverageAdx: number;

  buyWinAverageRsi: number;
  buyLossAverageRsi: number;
  buyWinAverageAdx: number;
  buyLossAverageAdx: number;

  buyTrades: number;
  buyWins: number;
  buyLosses: number;
  buyTotalR: number;

  sellTrades: number;
  sellWins: number;
  sellLosses: number;
  sellTotalR: number;

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
  test: BacktestSummary;

  trades: BacktestTrade[];

  totalFeeR: number;
  totalSlippageR: number;
}
