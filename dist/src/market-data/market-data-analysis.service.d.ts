import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "./entities/market-candle.entity";
export declare class MarketDataAnalysisService {
    private readonly indicatorsService;
    constructor(indicatorsService: IndicatorsService);
    getLatestRsi(candles: MarketCandle[]): number | null;
    getLatestSma(candles: MarketCandle[], period: number): number | null;
    getLatestEma(candles: MarketCandle[], period: number): number | null;
    comparePriceToSma(price: number, sma: number): "ABOVE" | "BELOW" | "EQUAL";
    comparePriceToEma(price: number, ema: number): "ABOVE" | "BELOW" | "EQUAL";
    compareSmaToEma(sma: number, ema: number): "SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA";
    determineTrend(price: number, sma: number, ema: number): "BULLISH" | "BEARISH" | "NEUTRAL";
    classifyRsi(rsi: number): "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
    determineMarketCondition(trend: "BULLISH" | "BEARISH" | "NEUTRAL", rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL"): "POSSIBLE_REVERSAL" | "BEARISH_CONTINUATION" | "BULLISH_CONTINUATION" | "NEUTRAL";
    calculateAtr(candles: MarketCandle[], period: number): number | null;
    calculateAdx(candles: MarketCandle[], period: number): number | null;
}
