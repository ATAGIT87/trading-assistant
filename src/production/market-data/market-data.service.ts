import { ConflictException, Injectable } from "@nestjs/common";

import { MarketCandle } from "./entities/market-candle.entity";
import { MarketCandleStorageService } from "./market-candle-storage.service";
import {
  MarketDataProviderService,
  SpotCandle,
} from "./market-data-provider.service";
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
    private readonly marketDataProviderService: MarketDataProviderService,
  ) {}

  getRecentClosedCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.storageService.getRecentClosedCandles(symbol, timeframe);
  }

  async getLatestClosedCandle(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle | null> {
    return (await this.getRecentClosedCandles(symbol, timeframe))[0] ?? null;
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

  async syncSpotCandles(symbol: string, timeframe: Timeframe): Promise<number> {
    const candles = await this.marketDataProviderService.getSpotCandles(
      symbol,
      timeframe,
      720,
    );

    const now = Date.now();

    const closedCandles = candles.filter(
      (candle) => candle.time.getTime() + timeframeDurationMs[timeframe] <= now,
    );

    return this.saveCandles(symbol, timeframe, closedCandles);
  }

  /** Execution telemetry only: minute candles never enter the hourly signal or its storage. */
  async getClosedMinuteCandles(
    symbol: string,
    start: Date,
    expectedEntry?: number,
  ): Promise<SpotCandle[]> {
    const now = Date.now();
    const minute = 60_000;
    const end = Math.floor(now / minute) * minute;
    if (
      !Number.isSafeInteger(+start) ||
      +start <= 0 ||
      +start % minute !== 0 ||
      +start > now
    )
      throw new Error("INVALID_MINUTE_EXIT_START");
    const expectedCount = (end - +start) / minute;
    if (expectedCount === 0) return [];
    if (expectedCount > 719) throw new Error("MINUTE_EXIT_WINDOW_UNAVAILABLE");
    const rows = await this.marketDataProviderService.getSpotCandles(
      symbol,
      "1m",
      expectedCount + 1,
    );
    const closed = rows
      .filter(
        (candle) => +candle.time >= +start && +candle.time + minute <= now,
      )
      .sort((a, b) => +a.time - +b.time);
    if (
      closed.length !== expectedCount ||
      closed.some((candle, index) => {
        const values = [
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
        ];
        return (
          +candle.time !== +start + index * minute ||
          !values.every(Number.isFinite) ||
          Math.min(candle.open, candle.high, candle.low, candle.close) <= 0 ||
          candle.volume < 0 ||
          candle.low > Math.min(candle.open, candle.close) ||
          candle.high < Math.max(candle.open, candle.close)
        );
      }) ||
      (expectedEntry !== undefined &&
        (!Number.isFinite(expectedEntry) ||
          Math.abs(closed[0].open - expectedEntry) > 1e-7))
    )
      throw new Error("MINUTE_EXIT_DATA_GAP_INVALID_OR_STALE");
    return closed;
  }

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
      (candidate) => +candidate.time === +expectedOpenTime,
    );
    if (
      !candle ||
      +candle.time + timeframeDurationMs[timeframe] <= Date.now() ||
      !Number.isFinite(candle.open)
    )
      return null;
    return candle.open;
  }

  private async saveCandles(
    symbol: string,
    timeframe: Timeframe,
    candles: SpotCandle[],
  ): Promise<number> {
    let savedCount = 0;

    for (const candle of candles) {
      try {
        await this.storageService.saveCandle(symbol, timeframe, candle);

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
