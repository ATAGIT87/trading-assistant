import { BacktestTrade } from "../interfaces/backtest-trade.interface";
export interface BacktestStatistics {
    entryTrades: number;
    entryWins: number;
    entryLosses: number;
    entryTotalR: number;
    winAverageRsi: number;
    lossAverageRsi: number;
    winAverageAdx: number;
    lossAverageAdx: number;
    winAverageMaeR: number;
    winAverageMfeR: number;
    winAverageDurationCandles: number;
    lossAverageMaeR: number;
    lossAverageMfeR: number;
    lossAverageDurationCandles: number;
    lossMfeAtLeast1R: number;
    lossMfeAtLeast2R: number;
}
export declare function calculateBacktestStatistics(trades: BacktestTrade[]): BacktestStatistics;
