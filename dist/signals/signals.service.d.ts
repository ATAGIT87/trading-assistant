import { TradingSignal } from "./signal.types";
import { MarketDataService } from "../market-data/market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly indicatorsService;
    constructor(marketDataService: MarketDataService, indicatorsService: IndicatorsService);
    determineAction(marketCondition: TradingSignal["marketCondition"], isStrongSetup: boolean): TradingSignal["action"];
    createSignal(trend: TradingSignal["trend"], entryPrice: number, atr: number, priceVsSma: "ABOVE" | "BELOW" | "EQUAL", priceVsEma: "ABOVE" | "BELOW" | "EQUAL", rsi: number, rsiStatus: TradingSignal["rsiStatus"], marketCondition: TradingSignal["marketCondition"]): TradingSignal;
    generateSignal(symbol: string, timeframe: Timeframe, period: number): Promise<TradingSignal | null>;
    calculateConfidence(trendScore: number, averageAlignmentScore: number, rsiScore: number): number;
    calculateStopLoss(action: 'BUY' | 'SELL', entryPrice: number, atr: number): number;
}
