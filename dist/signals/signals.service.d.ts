import { TradingSignal } from "./signal.types";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import type { MarketDataPort } from "./market-data.port";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly indicatorsService;
    constructor(marketDataService: MarketDataPort, indicatorsService: IndicatorsService);
    determineAction(trend: TradingSignal["trend"], marketCondition: TradingSignal["marketCondition"], isStrongSetup: boolean, adx: number, atr: number): TradingSignal["action"];
    createSignal(trend: TradingSignal["trend"], entryPrice: number, atr: number, priceVsSma: "ABOVE" | "BELOW" | "EQUAL", priceVsEma: "ABOVE" | "BELOW" | "EQUAL", rsi: number, adx: number, rsiStatus: TradingSignal["rsiStatus"], marketCondition: TradingSignal["marketCondition"]): TradingSignal;
    generateSignal(symbol: string, timeframe: Timeframe, period: number): Promise<TradingSignal | null>;
    calculateConfidence(trendScore: number, averageAlignmentScore: number, rsiScore: number, marketConditionScore: number, adxScore: number): number;
    calculateStopLoss(action: "BUY" | "SELL", entryPrice: number, atr: number): number;
    calculateTakeProfit(action: "BUY" | "SELL", entryPrice: number, stopLoss: number, riskRewardRatio: number): number;
}
