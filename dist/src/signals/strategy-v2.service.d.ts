import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { RiskManagerService } from "../risk/risk-manager.service";
import { TradingSignal } from "./signal.types";
export type StrategyV2Trend = "BULLISH" | "BEARISH" | "NEUTRAL";
export declare class StrategyV2Service {
    private readonly indicatorsService;
    private readonly riskManagerService;
    constructor(indicatorsService: IndicatorsService, riskManagerService: RiskManagerService);
    evaluateCandles(candles: MarketCandle[], startIndex?: number, endIndex?: number, _higherTimeframeTrend?: StrategyV2Trend): TradingSignal;
    getTrend(candles: MarketCandle[]): StrategyV2Trend | null;
    private calculateMomentum;
    private findPreviousSwingHigh;
    private findPreviousSwingLow;
    private calculateAdx14;
    private calculateAtr14;
    private calculateRsi;
    private buildNoTradeReason;
    private buildSignal;
}
