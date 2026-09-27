import { MarketCandle } from "../../market-data/entities/market-candle.entity";
import { TradingSignal } from "../../signals/signal.types";
export interface TradeOutcome {
    result: boolean | null;
    exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
    exitIndex: number | null;
    exitPrice: number | null;
    maeR: number;
    mfeR: number;
    durationCandles: number;
}
export declare function findTradeOutcome(signal: TradingSignal, futureCandles: MarketCandle[], maxHoldingCandles: number): TradeOutcome;
