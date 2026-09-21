import { BacktestTrade } from "../interfaces/backtest-trade.interface";
export declare function analyzeSellTrades(trades: BacktestTrade[]): {
    adxRange: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalR: number;
}[];
