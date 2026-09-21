import { Injectable } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "./entities/market-candle.entity";

@Injectable()
export class MarketDataAnalysisService {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  getLatestRsi(candles: MarketCandle[]): number | null {
    return this.indicatorsService.calculateRsiFromCandles(candles, 14);
  }

  getLatestSma(candles: MarketCandle[], period: number): number | null {
    return this.indicatorsService.calculateSmaFromCandles(candles, period);
  }

  getLatestEma(candles: MarketCandle[], period: number): number | null {
    return this.indicatorsService.calculateEma(
      candles.map((candle) => Number(candle.close)),
      period,
    );
  }

  comparePriceToSma(price: number, sma: number): "ABOVE" | "BELOW" | "EQUAL" {
    return this.indicatorsService.comparePriceToAverage(price, sma);
  }

  comparePriceToEma(price: number, ema: number): "ABOVE" | "BELOW" | "EQUAL" {
    return this.indicatorsService.comparePriceToAverage(price, ema);
  }

  compareSmaToEma(
    sma: number,
    ema: number,
  ): "SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" {
    return this.indicatorsService.compareSmaToEma(sma, ema);
  }

  determineTrend(
    price: number,
    sma: number,
    ema: number,
  ): "BULLISH" | "BEARISH" | "NEUTRAL" {
    const priceVsSma = this.indicatorsService.comparePriceToAverage(price, sma);

    const priceVsEma = this.indicatorsService.comparePriceToAverage(price, ema);

    return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
  }

  classifyRsi(rsi: number): "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" {
    return this.indicatorsService.classifyRsi(rsi);
  }

  determineMarketCondition(
    trend: "BULLISH" | "BEARISH" | "NEUTRAL",
    rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL",
  ):
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL" {
    return this.indicatorsService.determineMarketCondition(trend, rsiStatus);
  }

  calculateAtr(candles: MarketCandle[], period: number): number | null {
    if (candles.length < period + 1) {
      return null;
    }

    const trueRanges = this.indicatorsService.calculateTrueRangesFromCandles(
      candles.map((candle) => ({
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      })),
    );

    return this.indicatorsService.calculateAtr(trueRanges, period);
  }

  calculateAdx(candles: MarketCandle[], period: number): number | null {
    return this.indicatorsService.calculateAdxFromCandles(
      candles.map((candle) => ({
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      })),
      period,
    );
  }
}
