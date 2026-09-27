import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketCandle } from "./entities/market-candle.entity";
import { MarketCandleStorageService } from "./market-candle-storage.service";
import { MarketDataAnalysisService } from "./market-data-analysis.service";
import { MarketDataProviderService } from "./market-data-provider.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { timeframeDurationMs } from "../assets/timeframe.utils";
import {
  MarketDataQualityReport,
  assessMarketDataQuality,
} from "./market-data-quality";

@Injectable()
export class MarketDataService {
  constructor(
    private readonly storageService: MarketCandleStorageService,
    private readonly analysisService: MarketDataAnalysisService,
    private readonly marketDataProviderService: MarketDataProviderService,
  ) {}

  createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle> {
    return this.storageService.createCandle(dto);
  }

  findAllCandles(): Promise<MarketCandle[]> {
    return this.storageService.findAllCandles();
  }

  findCandlesBySymbol(symbol: string): Promise<MarketCandle[]> {
    return this.storageService.findCandlesBySymbol(symbol);
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
    return this.storageService.findLatestCandle(symbol, timeframe);
  }

  async getLatestPrice(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number | null> {
    const candle = await this.storageService.findLatestCandle(
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
    return this.storageService.getCandlesForAnalysis(symbol, timeframe);
  }

  async getLatestRsi(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.analysisService.getLatestRsi(candles);
  }

  async getLatestSma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.analysisService.getLatestSma(candles, period);
  }

  async getLatestEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.analysisService.getLatestEma(candles, period);
  }

  async compareLatestPriceToSma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"ABOVE" | "BELOW" | "EQUAL" | null> {
    const price = await this.getLatestPrice(symbol, timeframe);

    const sma = await this.getLatestSma(symbol, timeframe, period);

    if (price === null || sma === null) {
      return null;
    }

    return this.analysisService.comparePriceToSma(price, sma);
  }

  async compareLatestPriceToEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"ABOVE" | "BELOW" | "EQUAL" | null> {
    const price = await this.getLatestPrice(symbol, timeframe);

    const ema = await this.getLatestEma(symbol, timeframe, period);

    if (price === null || ema === null) {
      return null;
    }

    return this.analysisService.comparePriceToEma(price, ema);
  }

  async compareSmaToEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" | null> {
    const sma = await this.getLatestSma(symbol, timeframe, period);

    const ema = await this.getLatestEma(symbol, timeframe, period);

    if (sma === null || ema === null) {
      return null;
    }

    return this.analysisService.compareSmaToEma(sma, ema);
  }

  async getTrend(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null> {
    const price = await this.getLatestPrice(symbol, timeframe);

    const sma = await this.getLatestSma(symbol, timeframe, period);

    const ema = await this.getLatestEma(symbol, timeframe, period);

    if (price === null || sma === null || ema === null) {
      return null;
    }

    return this.analysisService.determineTrend(price, sma, ema);
  }

  async getRsiStatus(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | null> {
    const rsi = await this.getLatestRsi(symbol, timeframe);

    if (rsi === null) {
      return null;
    }

    return this.analysisService.classifyRsi(rsi);
  }

  async getMarketCondition(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL"
    | null
  > {
    const trend = await this.getTrend(symbol, timeframe, period);

    const rsiStatus = await this.getRsiStatus(symbol, timeframe, period);

    if (trend === null || rsiStatus === null) {
      return null;
    }

    return this.analysisService.determineMarketCondition(trend, rsiStatus);
  }

  async getLatestAtr(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.analysisService.calculateAtr(candles, period);
  }

  async getLatestAdx(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.analysisService.calculateAdx(candles, period);
  }

  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.storageService.getHistoricalCandles(symbol, timeframe);
  }

  async getDataQuality(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketDataQualityReport> {
    return assessMarketDataQuality(
      symbol,
      timeframe,
      await this.getHistoricalCandles(symbol, timeframe),
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

  async buildFourHourCandles(symbol: string): Promise<number> {
    const hourlyCandles = await this.storageService.getHistoricalCandles(
      symbol,
      Timeframe.ONE_HOUR,
    );

    if (hourlyCandles.length === 0) {
      return 0;
    }

    const groups = new Map<number, MarketCandle[]>();

    for (const candle of hourlyCandles) {
      const time = new Date(candle.time);

      const alignedHour = Math.floor(time.getUTCHours() / 4) * 4;

      const startTime = new Date(time);

      startTime.setUTCHours(alignedHour, 0, 0, 0);

      const key = startTime.getTime();

      const group = groups.get(key) ?? [];

      group.push(candle);
      groups.set(key, group);
    }

    const fourHourCandles: MarketCandle[] = [];

    for (const [startTime, candles] of groups) {
      candles.sort((a, b) => a.time.getTime() - b.time.getTime());

      if (candles.length !== 4) {
        continue;
      }

      const first = candles[0];
      const last = candles[candles.length - 1];

      const high = Math.max(...candles.map((candle) => Number(candle.high)));

      const low = Math.min(...candles.map((candle) => Number(candle.low)));

      const volume = candles.reduce(
        (sum, candle) => sum + Number(candle.volume),
        0,
      );

      const fourHourCandle = new MarketCandle();

      fourHourCandle.symbol = symbol;

      fourHourCandle.timeframe = Timeframe.FOUR_HOURS;

      fourHourCandle.time = new Date(startTime);

      fourHourCandle.open = first.open;

      fourHourCandle.high = high.toString();

      fourHourCandle.low = low.toString();

      fourHourCandle.close = last.close;

      fourHourCandle.volume = volume.toString();

      fourHourCandles.push(fourHourCandle);
    }

    await this.storageService.replaceFourHourCandles(symbol, fourHourCandles);

    return fourHourCandles.length;
  }

  async repairSpotGaps(
    symbol: string,
    timeframe: Exclude<Timeframe, Timeframe.FOUR_HOURS>,
  ): Promise<{ gapsFound: number; received: number; saved: number }> {
    const durationMs = timeframeDurationMs[timeframe];
    const candles = await this.getHistoricalCandles(symbol, timeframe);
    let gapsFound = 0;
    let received = 0;
    let saved = 0;

    for (let index = 1; index < candles.length; index++) {
      const previous = candles[index - 1];
      const next = candles[index];
      const missing =
        Math.round(
          (next.time.getTime() - previous.time.getTime()) / durationMs,
        ) - 1;
      if (missing <= 0) {
        continue;
      }

      gapsFound++;
      const batch = await this.marketDataProviderService.getSpotCandles(
        symbol,
        timeframe,
        Math.min(missing + 2, 720),
      );
      const missingCandles = batch.filter(
        (candle) =>
          candle.time.getTime() > previous.time.getTime() &&
          candle.time.getTime() < next.time.getTime() &&
          candle.time.getTime() + durationMs <= Date.now(),
      );
      received += missingCandles.length;
      saved += await this.saveCandles(symbol, timeframe, missingCandles);
    }

    return { gapsFound, received, saved };
  }

  async syncSpotCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number> {
    const candles = await this.marketDataProviderService.getSpotCandles(
      symbol,
      timeframe,
      720,
    );

    const timeframeMs: Record<Timeframe, number> = {
      [Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,

      [Timeframe.ONE_HOUR]: 60 * 60 * 1000,

      [Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,

      [Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
    };

    const now = Date.now();

    const closedCandles = candles.filter(
      (candle) => candle.time.getTime() + timeframeMs[timeframe] <= now,
    );

    return this.saveCandles(symbol, timeframe, closedCandles);
  }

  /**
   * Reads the opening price of the currently live candle without persisting it.
   *
   * Persisted market candles are deliberately closed candles only, so strategy
   * calculation cannot accidentally use an unfinished candle.  A live paper
   * entry is the one exception: its fill must use the next candle's actual
   * opening price, which Kraken exposes while that candle is in progress.
   */
  async getLiveCandleOpen(
    symbol: string,
    timeframe: Timeframe,
    expectedOpenTime: Date,
  ): Promise<number | null> {
    const candles = await this.marketDataProviderService.getSpotCandles(
      symbol,
      timeframe,
      2,
    );
    const candle = candles.find(
      (candidate) => candidate.time.getTime() === expectedOpenTime.getTime(),
    );

    if (
      !candle ||
      candle.time.getTime() + timeframeDurationMs[timeframe] <= Date.now() ||
      !Number.isFinite(candle.open)
    ) {
      return null;
    }

    return candle.open;
  }

  async backfillSpotCandles(
    symbol: string,
    timeframe: Timeframe,
    days: number,
  ): Promise<{ received: number; saved: number }> {
    throw new BadRequestException(
      `Kraken's public OHLC endpoint retains only recent candles; ${days} days cannot be backfilled reliably. Live Demo sync remains available.`,
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
        if (error instanceof ConflictException) {
          continue;
        }

        throw error;
      }
    }

    return savedCount;
  }
}
