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
  ): Promise<TradingSignal["trend"] | null> {
    const higherTimeframe = this.getHigherTimeframe(timeframe);

    if (higherTimeframe === null) {
      return null;
    }

    return this.marketDataService.getTrend(symbol, higherTimeframe, period);
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

    const candlesUntil = preloadedCandles
      ? candles.filter((candle) => candle.time.getTime() <= until.getTime())
      : candles;

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
