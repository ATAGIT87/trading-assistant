import { Timeframe } from "../../assets/enums/timeframe.enum";
export declare class Signal {
    id: number;
    symbol: string;
    timeframe: Timeframe;
    candleTime: Date;
    action: string;
    confidence: number;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    trend: string;
    rsi: number;
    adx: number;
    marketCondition: string;
    isStrongSetup: boolean;
    reason: string;
    createdAt: Date;
}
