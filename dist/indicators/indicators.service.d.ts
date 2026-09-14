import { MarketCandle } from "../market-data/entities/market-candle.entity";
export declare class IndicatorsService {
    calculateSma(values: number[], period: number): number | null;
    calculateSmaFromCandles(candles: MarketCandle[], period: number): number | null;
    calculateEma(values: number[], period: number): number | null;
    calculatePriceChanges(values: number[]): number[];
    calculateGainsAndLosses(changes: number[]): {
        gains: number[];
        losses: number[];
    };
    calculateAverage(values: number[], period: number): number | null;
    calculateRsi(averageGain: number, averageLoss: number): number;
    calculateRsiFromPrices(values: number[], period: number): number | null;
    calculateRsiFromCandles(candles: MarketCandle[], period: number): number | null;
    comparePriceToAverage(price: number, average: number): "ABOVE" | "BELOW" | "EQUAL";
    compareSmaToEma(sma: number, ema: number): "SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA";
    determineTrend(priceVsSma: "ABOVE" | "BELOW" | "EQUAL", priceVsEma: "ABOVE" | "BELOW" | "EQUAL"): "BULLISH" | "BEARISH" | "NEUTRAL";
    classifyRsi(rsi: number): 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    determineMarketCondition(trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL', rsiStatus: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL'): 'POSSIBLE_REVERSAL' | 'BEARISH_CONTINUATION' | 'BULLISH_CONTINUATION' | 'NEUTRAL';
}
