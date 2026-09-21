import { IndicatorsService } from "../indicators/indicators.service";
import { TradingSignal } from "./signal.types";
export declare class SignalCalculationService {
    private readonly indicatorsService;
    constructor(indicatorsService: IndicatorsService);
    createSignal(trend: TradingSignal["trend"], entryPrice: number, atr: number, priceVsSma: "ABOVE" | "BELOW" | "EQUAL", priceVsEma: "ABOVE" | "BELOW" | "EQUAL", rsi: number, adx: number, rsiStatus: TradingSignal["rsiStatus"], marketCondition: TradingSignal["marketCondition"], higherTimeframeTrend: TradingSignal["trend"] | null, candleTime: Date, excludeHighAdxSell: boolean): TradingSignal;
    determineAction(higherTimeframeTrend: TradingSignal["trend"] | null, trend: TradingSignal["trend"], marketCondition: TradingSignal["marketCondition"], isStrongSetup: boolean, adx: number, atr: number, excludeHighAdxSell: boolean): TradingSignal["action"];
    calculateConfidence(trendScore: number, averageAlignmentScore: number, rsiScore: number, marketConditionScore: number, adxScore: number): number;
    calculateStopLoss(action: "BUY" | "SELL", entryPrice: number, atr: number): number;
    calculateTakeProfit(action: "BUY" | "SELL", entryPrice: number, stopLoss: number, riskRewardRatio: number): number;
}
