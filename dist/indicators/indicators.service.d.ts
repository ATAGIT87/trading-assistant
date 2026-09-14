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
}
