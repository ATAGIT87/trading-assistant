import {
  ConflictException,
  Injectable,
} from "@nestjs/common";

import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketCandle } from "./entities/market-candle.entity";
import { MarketCandleStorageService } from "./market-candle-storage.service";
import { MarketDataAnalysisService } from "./market-data-analysis.service";
import { MarketDataProviderService } from "./market-data-provider.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Injectable()
export class MarketDataService {
  constructor(
    private readonly storageService: MarketCandleStorageService,
    private readonly analysisService: MarketDataAnalysisService,
    private readonly marketDataProviderService: MarketDataProviderService,
  ) {}

  createCandle(
    dto: CreateMarketCandleDto,
  ): Promise<MarketCandle> {
    return this.storageService.createCandle(
      dto,
    );
  }

  findAllCandles(): Promise<MarketCandle[]> {
    return this.storageService.findAllCandles();
  }

  findCandlesBySymbol(
    symbol: string,
  ): Promise<MarketCandle[]> {
    return this.storageService.findCandlesBySymbol(
      symbol,
    );
  }

  findCandlesBySymbolAndTimeframe(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.storageService.findCandlesBySymbolAndTimeframe(
      symbol,
      timeframe,
    );
  }

  async findLatestCandle(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle | null> {
    return this.storageService.findLatestCandle(
      symbol,
      timeframe,
    );
  }

  async getLatestPrice(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number | null> {
    const candle =
      await this.storageService.findLatestCandle(
        symbol,
        timeframe,
      );

    if (!candle) {
      return null;
    }

    return Number(candle.close);
  }

  getCandlesForAnalysis(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.storageService.getCandlesForAnalysis(
      symbol,
      timeframe,
    );
  }

  async getLatestRsi(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number | null> {
    const candles =
      await this.getCandlesForAnalysis(
        symbol,
        timeframe,
      );

    return this.analysisService.getLatestRsi(
      candles,
    );
  }

  async getLatestSma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles =
      await this.getCandlesForAnalysis(
        symbol,
        timeframe,
      );

    return this.analysisService.getLatestSma(
      candles,
      period,
    );
  }

  async getLatestEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles =
      await this.getCandlesForAnalysis(
        symbol,
        timeframe,
      );

    return this.analysisService.getLatestEma(
      candles,
      period,
    );
  }

  async compareLatestPriceToSma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<
    "ABOVE" | "BELOW" | "EQUAL" | null
  > {
    const price =
      await this.getLatestPrice(
        symbol,
        timeframe,
      );

    const sma =
      await this.getLatestSma(
        symbol,
        timeframe,
        period,
      );

    if (price === null || sma === null) {
      return null;
    }

    return this.analysisService.comparePriceToSma(
      price,
      sma,
    );
  }

  async compareLatestPriceToEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<
    "ABOVE" | "BELOW" | "EQUAL" | null
  > {
    const price =
      await this.getLatestPrice(
        symbol,
        timeframe,
      );

    const ema =
      await this.getLatestEma(
        symbol,
        timeframe,
        period,
      );

    if (price === null || ema === null) {
      return null;
    }

    return this.analysisService.comparePriceToEma(
      price,
      ema,
    );
  }

  async compareSmaToEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ):
    Promise<
      | "SMA_ABOVE_EMA"
      | "SMA_BELOW_EMA"
      | "SMA_EQUAL_EMA"
      | null
    > {
    const sma =
      await this.getLatestSma(
        symbol,
        timeframe,
        period,
      );

    const ema =
      await this.getLatestEma(
        symbol,
        timeframe,
        period,
      );

    if (sma === null || ema === null) {
      return null;
    }

    return this.analysisService.compareSmaToEma(
      sma,
      ema,
    );
  }

  async getTrend(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<
    "BULLISH" | "BEARISH" | "NEUTRAL" | null
  > {
    const price =
      await this.getLatestPrice(
        symbol,
        timeframe,
      );

    const sma =
      await this.getLatestSma(
        symbol,
        timeframe,
        period,
      );

    const ema =
      await this.getLatestEma(
        symbol,
        timeframe,
        period,
      );

    if (
      price === null ||
      sma === null ||
      ema === null
    ) {
      return null;
    }

    return this.analysisService.determineTrend(
      price,
      sma,
      ema,
    );
  }

  async getRsiStatus(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ):
    Promise<
      "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | null
    > {
    const rsi =
      await this.getLatestRsi(
        symbol,
        timeframe,
      );

    if (rsi === null) {
      return null;
    }

    return this.analysisService.classifyRsi(
      rsi,
    );
  }

  async getMarketCondition(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ):
    Promise<
      | "POSSIBLE_REVERSAL"
      | "BEARISH_CONTINUATION"
      | "BULLISH_CONTINUATION"
      | "NEUTRAL"
      | null
    > {
    const trend =
      await this.getTrend(
        symbol,
        timeframe,
        period,
      );

    const rsiStatus =
      await this.getRsiStatus(
        symbol,
        timeframe,
        period,
      );

    if (
      trend === null ||
      rsiStatus === null
    ) {
      return null;
    }

    return this.analysisService.determineMarketCondition(
      trend,
      rsiStatus,
    );
  }

  async getLatestAtr(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles =
      await this.getCandlesForAnalysis(
        symbol,
        timeframe,
      );

    return this.analysisService.calculateAtr(
      candles,
      period,
    );
  }

  async getLatestAdx(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles =
      await this.getCandlesForAnalysis(
        symbol,
        timeframe,
      );

    return this.analysisService.calculateAdx(
      candles,
      period,
    );
  }

  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.storageService.getHistoricalCandles(
      symbol,
      timeframe,
    );
  }

  getHistoricalCandlesUntil(
    symbol: string,
    timeframe: Timeframe,
    until: Date,
  ): Promise<MarketCandle[]> {
    return this.storageService.getHistoricalCandlesUntil(
      symbol,
      timeframe,
      until,
    );
  }

  async buildFourHourCandles(
    symbol: string,
  ): Promise<number> {
    const hourlyCandles =
      await this.storageService.getHistoricalCandles(
        symbol,
        Timeframe.ONE_HOUR,
      );

    if (hourlyCandles.length === 0) {
      return 0;
    }

    const groups =
      new Map<number, MarketCandle[]>();

    for (const candle of hourlyCandles) {
      const time =
        new Date(candle.time);

      const alignedHour =
        Math.floor(
          time.getUTCHours() / 4,
        ) * 4;

      const startTime =
        new Date(time);

      startTime.setUTCHours(
        alignedHour,
        0,
        0,
        0,
      );

      const key =
        startTime.getTime();

      const group =
        groups.get(key) ?? [];

      group.push(candle);
      groups.set(key, group);
    }

    const fourHourCandles: MarketCandle[] =
      [];

    for (const [
      startTime,
      candles,
    ] of groups) {
      candles.sort(
        (a, b) =>
          a.time.getTime() -
          b.time.getTime(),
      );

      if (candles.length !== 4) {
        continue;
      }

      const first = candles[0];
      const last =
        candles[candles.length - 1];

      const high = Math.max(
        ...candles.map((candle) =>
          Number(candle.high),
        ),
      );

      const low = Math.min(
        ...candles.map((candle) =>
          Number(candle.low),
        ),
      );

      const volume =
        candles.reduce(
          (sum, candle) =>
            sum +
            Number(candle.volume),
          0,
        );

      const fourHourCandle =
        new MarketCandle();

      fourHourCandle.symbol =
        symbol;

      fourHourCandle.timeframe =
        Timeframe.FOUR_HOURS;

      fourHourCandle.time =
        new Date(startTime);

      fourHourCandle.open =
        first.open;

      fourHourCandle.high =
        high.toString();

      fourHourCandle.low =
        low.toString();

      fourHourCandle.close =
        last.close;

      fourHourCandle.volume =
        volume.toString();

      fourHourCandles.push(
        fourHourCandle,
      );
    }

    await this.storageService.deleteFourHourCandles(
      symbol,
    );

    if (
      fourHourCandles.length === 0
    ) {
      return 0;
    }

    await this.storageService.saveCandles(
      fourHourCandles,
    );

    return fourHourCandles.length;
  }

  async syncBinanceCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number> {
    const candles =
      await this.marketDataProviderService.getBinanceCandles(
        symbol,
        timeframe,
        1000,
      );

    const timeframeMs:
      Record<Timeframe, number> = {
      [Timeframe.FIFTEEN_MINUTES]:
        15 * 60 * 1000,

      [Timeframe.ONE_HOUR]:
        60 * 60 * 1000,

      [Timeframe.FOUR_HOURS]:
        4 * 60 * 60 * 1000,

      [Timeframe.ONE_DAY]:
        24 * 60 * 60 * 1000,
    };

    const now = Date.now();

    const closedCandles =
      candles.filter(
        (candle) =>
          candle.time.getTime() +
            timeframeMs[timeframe] <=
          now,
      );

    return this.saveCandles(
      symbol,
      timeframe,
      closedCandles,
    );
  }

  async saveCandles(
    symbol: string,
    timeframe: Timeframe,
    candles: {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[],
  ): Promise<number> {
    let savedCount = 0;

    for (const candle of candles) {
      try {
        await this.storageService.createCandle({
          symbol,
          timeframe,
          time: candle.time.toISOString(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        });

        savedCount++;
      } catch (error) {
        if (
          error instanceof ConflictException
        ) {
          continue;
        }

        throw error;
      }
    }

    return savedCount;
  }
}