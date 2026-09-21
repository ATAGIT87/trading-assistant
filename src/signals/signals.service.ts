import { Inject, Injectable } from "@nestjs/common";

import { TradingSignal } from "./signal.types";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import type { MarketDataPort } from "./market-data.port";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { SignalStorageService } from "./signal-storage.service";
import { SignalCalculationService } from "./signal-calculation.service";
import { SignalTimeframeService } from "./signal-timeframe.service";

@Injectable()
export class SignalsService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataPort,
    private readonly indicatorsService: IndicatorsService,
    private readonly signalStorageService: SignalStorageService,
    private readonly signalCalculationService: SignalCalculationService,
    private readonly signalTimeframeService: SignalTimeframeService,
  ) {}

  async generateSignal(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<TradingSignal | null> {
    const trend = await this.marketDataService.getTrend(
      symbol,
      timeframe,
      period,
    );

    const higherTimeframeTrend =
      await this.signalTimeframeService.getHigherTimeframeTrend(
        symbol,
        timeframe,
        period,
      );

    const priceVsSma = await this.marketDataService.compareLatestPriceToSma(
      symbol,
      timeframe,
      period,
    );

    const priceVsEma = await this.marketDataService.compareLatestPriceToEma(
      symbol,
      timeframe,
      period,
    );

    const rsi = await this.marketDataService.getLatestRsi(symbol, timeframe);

    const rsiStatus = await this.marketDataService.getRsiStatus(
      symbol,
      timeframe,
      period,
    );

    const marketCondition = await this.marketDataService.getMarketCondition(
      symbol,
      timeframe,
      period,
    );

    const entryPrice = await this.marketDataService.getLatestPrice(
      symbol,
      timeframe,
    );

    const atr = await this.marketDataService.getLatestAtr(
      symbol,
      timeframe,
      period,
    );

    const adx = await this.marketDataService.getLatestAdx(
      symbol,
      timeframe,
      period,
    );

    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    if (candles.length === 0) {
      return null;
    }

    const latestCandle = candles[candles.length - 1];

    if (
      trend === null ||
      priceVsSma === null ||
      priceVsEma === null ||
      rsi === null ||
      rsiStatus === null ||
      marketCondition === null ||
      entryPrice === null ||
      atr === null ||
      adx === null
    ) {
      return null;
    }

    const signal = this.signalCalculationService.createSignal(
      trend,
      entryPrice,
      atr,
      priceVsSma,
      priceVsEma,
      rsi,
      adx,
      rsiStatus,
      marketCondition,
      higherTimeframeTrend,
      latestCandle.time,
      false,
    );

    const existingSignal =
      await this.signalStorageService.getSignalByCandleTime(
        symbol,
        timeframe,
        latestCandle.time,
      );

    if (!existingSignal) {
      await this.signalStorageService.saveSignal(symbol, timeframe, signal);
    }

    return signal;
  }

  async generateSignalFromCandles(
    symbol: string,
    timeframe: Timeframe,
    candles: MarketCandle[],
    higherTimeframeCandles?: MarketCandle[],
    useHigherTimeframeConfirmation = true,
    excludeHighAdxSell = false,
  ): Promise<TradingSignal | null> {
    const indicators = this.indicatorsService.calculateIndicatorsFromCandles(
      candles,
      14,
    );

    if (indicators === null) {
      return null;
    }

    const latestCandle = candles[candles.length - 1];

    const entryPrice = Number(latestCandle.close);

    const higherTimeframeTrend = useHigherTimeframeConfirmation
      ? await this.signalTimeframeService.getHigherTimeframeTrendFromCandles(
          symbol,
          timeframe,
          latestCandle.time,
          higherTimeframeCandles,
        )
      : null;

    const {
      trend,
      priceVsSma,
      priceVsEma,
      rsi,
      rsiStatus,
      marketCondition,
      atr,
      adx,
    } = indicators;

    return this.signalCalculationService.createSignal(
      trend,
      entryPrice,
      atr,
      priceVsSma,
      priceVsEma,
      rsi,
      adx,
      rsiStatus,
      marketCondition,
      higherTimeframeTrend,
      latestCandle.time,
      excludeHighAdxSell,
    );
  }

  async getSignalByCandleTime(
    symbol: string,
    timeframe: Timeframe,
    candleTime: Date,
  ) {
    return this.signalStorageService.getSignalByCandleTime(
      symbol,
      timeframe,
      candleTime,
    );
  }
}
