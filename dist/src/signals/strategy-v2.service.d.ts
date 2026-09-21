import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "./signal.types";
export type StrategyV2Trend = "BULLISH" | "BEARISH" | "NEUTRAL";
export declare class StrategyV2Service {
    private readonly indicatorsService;
    constructor(indicatorsService?: IndicatorsService);
    evaluateCandles(candles: MarketCandle[], startIndex?: number, endIndex?: number, higherTimeframeTrend?: StrategyV2Trend, higherTimeframeCandleTime?: Date, higherTimeframeDurationMs?: number): TradingSignal;
    private isCompletedHigherTimeframeCandle;
    private getRegime;
    private calculateAdx14;
    private calculateAtr14;
    private calculateTrailingMedianAtr14;
    private classifyAtrRegime;
    private calculateRsi;
    private findLatestBreakoutEvent;
    private findConfirmationEvent;
    private calculateStructuralStop;
    private calculateStructuralTarget;
    private buildSignal;
}
