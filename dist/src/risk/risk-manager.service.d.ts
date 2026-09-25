import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { SignalAction } from "../signals/signal.types";
export interface RiskLevels {
    stopLoss: number | null;
    takeProfit: number | null;
    riskReward: number | null;
}
export declare class RiskManagerService {
    calculateLevels(action: SignalAction, entryPrice: number, candles: MarketCandle[], atr: number): RiskLevels;
}
