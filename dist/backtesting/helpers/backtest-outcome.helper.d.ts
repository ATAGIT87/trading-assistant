import { MarketCandle } from "../../market-data/entities/market-candle.entity";
import { TradingSignal } from "../../signals/signal.types";
export interface TradeOutcome {
    result: boolean | null;
    exitIndex: number | null;
    maeR: number;
    mfeR: number;
    durationCandles: number;
}
export declare function findTradeOutcome(signal: TradingSignal, futureCandles: MarketCandle[]): TradeOutcome;
