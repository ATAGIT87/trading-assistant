import { TradingSignal } from "../../signals/signal.types";
export interface BacktestTrade {
    riskAmount: number;
    resultR: number | null;
    maeR: number;
    mfeR: number;
    durationCandles: number;
    time: Date;
    action: "BUY" | "SELL";
    confidence: number;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    trend: TradingSignal["trend"];
    rsi: number;
    adx: number;
    marketCondition: TradingSignal["marketCondition"];
    result: "WIN" | "LOSS" | "OPEN";
    exitTime: Date | null;
}
