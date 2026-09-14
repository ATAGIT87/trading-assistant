import { Injectable } from "@nestjs/common";
import { MarketCandle } from "../market-data/entities/market-candle.entity";

@Injectable()
export class IndicatorsService {
  calculateSma(values: number[], period: number): number | null {
    if (values.length < period) {
      return null;
    }

    const recentValues = values.slice(-period);

    const sum = recentValues.reduce((total, value) => total + value, 0);

    return sum / period;
  }

  calculateSmaFromCandles(
    candles: MarketCandle[],
    period: number,
  ): number | null {
    const closes = candles.map((candle) => Number(candle.close));

    return this.calculateSma(closes, period);
  }

  calculateEma(values: number[], period: number): number | null {
    if (values.length < period) {
      return null;
    }

    const initialValues = values.slice(0, period);

    let ema = initialValues.reduce((sum, value) => sum + value, 0) / period;

    const multiplier = 2 / (period + 1);

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  calculatePriceChanges(values: number[]): number[] {
    const changes: number[] = [];

    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }

    return changes;
  }
  calculateGainsAndLosses(changes: number[]): {
    gains: number[];
    losses: number[];
  } {
    const gains: number[] = [];
    const losses: number[] = [];

    for (const change of changes) {
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    return {
      gains,
      losses,
    };
  }
  calculateAverage(values: number[], period: number): number | null {
    if (values.length < period) {
      return null;
    }

    const recentValues = values.slice(-period);

    const sum = recentValues.reduce((total, value) => total + value, 0);

    return sum / period;
  }

  calculateRsi(averageGain: number, averageLoss: number): number {
    if (averageLoss === 0) {
      return 100;
    }

    const rs = averageGain / averageLoss;

    return 100 - 100 / (1 + rs);
  }

  calculateRsiFromPrices(values: number[], period: number): number | null {
    if (values.length <= period) {
      return null;
    }

    const changes = this.calculatePriceChanges(values);

    const { gains, losses } = this.calculateGainsAndLosses(changes);

    const averageGain = this.calculateAverage(gains, period);

    const averageLoss = this.calculateAverage(losses, period);

    if (averageGain === null || averageLoss === null) {
      return null;
    }

    return this.calculateRsi(averageGain, averageLoss);
  }
  calculateRsiFromCandles(
    candles: MarketCandle[],
    period: number,
  ): number | null {
    const closes = candles.map((candle) => Number(candle.close));

    return this.calculateRsiFromPrices(closes, period);
  }

  comparePriceToAverage(
    price: number,
    average: number,
  ): "ABOVE" | "BELOW" | "EQUAL" {
    if (price > average) {
      return "ABOVE";
    }

    if (price < average) {
      return "BELOW";
    }

    return "EQUAL";
  }

  compareSmaToEma(
    sma: number,
    ema: number,
  ): "SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" {
    if (sma > ema) {
      return "SMA_ABOVE_EMA";
    }

    if (sma < ema) {
      return "SMA_BELOW_EMA";
    }

    return "SMA_EQUAL_EMA";
  }

  determineTrend(
    priceVsSma: "ABOVE" | "BELOW" | "EQUAL",
    priceVsEma: "ABOVE" | "BELOW" | "EQUAL",
  ): "BULLISH" | "BEARISH" | "NEUTRAL" {
    if (priceVsSma === "ABOVE" && priceVsEma === "ABOVE") {
      return "BULLISH";
    }

    if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
      return "BEARISH";
    }

    return "NEUTRAL";
  }

  classifyRsi(rsi: number): "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" {
    if (rsi < 30) {
      return "OVERSOLD";
    }

    if (rsi > 70) {
      return "OVERBOUGHT";
    }

    return "NEUTRAL";
  }
  determineMarketCondition(
    trend: "BULLISH" | "BEARISH" | "NEUTRAL",
    rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL",
  ):
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL" {
    if (trend === "BEARISH" && rsiStatus === "OVERSOLD") {
      return "POSSIBLE_REVERSAL";
    }

    if (trend === "BEARISH" && rsiStatus === "NEUTRAL") {
      return "BEARISH_CONTINUATION";
    }

    if (trend === "BULLISH" && rsiStatus === "OVERBOUGHT") {
      return "POSSIBLE_REVERSAL";
    }

    if (trend === "BULLISH" && rsiStatus === "NEUTRAL") {
      return "BULLISH_CONTINUATION";
    }

    return "NEUTRAL";
  }

  calculateTrendScore(trend: "BULLISH" | "BEARISH" | "NEUTRAL"): number {
    if (trend === "BULLISH" || trend === "BEARISH") {
      return 40;
    }

    return 0;
  }

  calculateAverageAlignmentScore(
    priceVsSma: "ABOVE" | "BELOW" | "EQUAL",
    priceVsEma: "ABOVE" | "BELOW" | "EQUAL",
  ): number {
    if (priceVsSma === "ABOVE" && priceVsEma === "ABOVE") {
      return 40;
    }

    if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
      return 40;
    }

    if (priceVsSma === "EQUAL" || priceVsEma === "EQUAL") {
      return 20;
    }

    return 0;
  }

  calculateRsiScore(rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL"): number {
    if (rsiStatus === "NEUTRAL") {
      return 20;
    }

    return 10;
  }
}
