import { Inject, Injectable } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import type { MarketDataPort } from "./market-data.port";
import { TradingSignal } from "./signal.types";

@Injectable()
export class SignalTimeframeService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataPort,
    private readonly indicatorsService: IndicatorsService,
  ) {}

  async getHigherTimeframeTrend(
    symbol: string,
    timeframe: Timeframe,
    period: number,
    until: Date = new Date(),
  ): Promise<TradingSignal["trend"] | null> {
    const higherTimeframe = this.getHigherTimeframe(timeframe);

    if (higherTimeframe === null) {
      return null;
    }

    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      higherTimeframe,
    );

    const completedCandles = candles.filter((candle) =>
      this.isCompletedCandle(candle.time, until, higherTimeframe),
    );

    if (completedCandles.length < 28) {
      return null;
    }

    const latestClose = Number(completedCandles[completedCandles.length - 1].close);

    const closes = completedCandles.map((candle) => Number(candle.close));

    const sma = this.indicatorsService.calculateSma(closes, 14);

    const ema = this.indicatorsService.calculateEma(closes, 14);

    if (sma === null || ema === null) {
      return null;
    }

    const priceVsSma = this.indicatorsService.comparePriceToAverage(
      latestClose,
      sma,
    );

    const priceVsEma = this.indicatorsService.comparePriceToAverage(
      latestClose,
      ema,
    );

    return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
  }

  async getHigherTimeframeTrendFromCandles(
    symbol: string,
    timeframe: Timeframe,
    until: Date,
    preloadedCandles?: MarketCandle[],
  ): Promise<TradingSignal["trend"] | null> {
    const higherTimeframe = this.getHigherTimeframe(timeframe);

    if (higherTimeframe === null) {
      return null;
    }

    const candles =
      preloadedCandles ??
      (await this.marketDataService.getHistoricalCandlesUntil(
        symbol,
        higherTimeframe,
        until,
      ));

    const candlesUntil = candles.filter((candle) =>
      this.isCompletedCandle(candle.time, until, higherTimeframe),
    );

    if (candlesUntil.length < 28) {
      return null;
    }

    const latestClose = Number(candlesUntil[candlesUntil.length - 1].close);

    const closes = candlesUntil.map((candle) => Number(candle.close));

    const sma = this.indicatorsService.calculateSma(closes, 14);

    const ema = this.indicatorsService.calculateEma(closes, 14);

    if (sma === null || ema === null) {
      return null;
    }

    const priceVsSma = this.indicatorsService.comparePriceToAverage(
      latestClose,
      sma,
    );

    const priceVsEma = this.indicatorsService.comparePriceToAverage(
      latestClose,
      ema,
    );

    return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
  }

  private isCompletedCandle(
    candleTime: Date,
    signalTime: Date,
    candleTimeframe: Timeframe,
  ): boolean {
    // Candle timestamps are bar starts. A candle for 1h at 02:00 represents
    // the interval [02:00, 03:00), so it must not be used when evaluating a
    // signal at 02:00. The last completed bar is strictly before the signal time.
    const candleEndTime = new Date(
      candleTime.getTime() + this.getTimeframeDurationMs(candleTimeframe),
    );

    return candleEndTime.getTime() < signalTime.getTime();
  }

  private getTimeframeDurationMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case Timeframe.FIFTEEN_MINUTES:
        return 15 * 60 * 1000;
      case Timeframe.ONE_HOUR:
        return 60 * 60 * 1000;
      case Timeframe.FOUR_HOURS:
        return 4 * 60 * 60 * 1000;
      case Timeframe.ONE_DAY:
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private getHigherTimeframe(timeframe: Timeframe): Timeframe | null {
    if (timeframe === Timeframe.FIFTEEN_MINUTES) {
      return Timeframe.ONE_HOUR;
    }

    if (timeframe === Timeframe.ONE_HOUR) {
      return Timeframe.FOUR_HOURS;
    }

    if (timeframe === Timeframe.FOUR_HOURS) {
      return Timeframe.ONE_DAY;
    }

    return null;
  }
}
