import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, QueryFailedError, Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { timeframeDurationMs } from "../assets/timeframe.utils";
import { MarketCandle } from "./entities/market-candle.entity";
import { SpotCandle } from "./market-data-provider.service";

@Injectable()
export class MarketCandleStorageService {
  constructor(
    @InjectRepository(MarketCandle)
    private readonly marketCandleRepository: Repository<MarketCandle>,
  ) {}

  async saveCandle(
    symbol: string,
    timeframe: Timeframe,
    input: SpotCandle,
  ): Promise<MarketCandle> {
    try {
      const candle = this.marketCandleRepository.create({
        symbol,
        timeframe,
        time: input.time,
        open: input.open.toString(),
        high: input.high.toString(),
        low: input.low.toString(),
        close: input.close.toString(),
        volume: input.volume.toString(),
      });

      return await this.marketCandleRepository.save(candle);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === "23505"
      ) {
        throw new ConflictException("Candle already exists");
      }

      throw error;
    }
  }

  getRecentClosedCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
        time: LessThanOrEqual(
          new Date(Date.now() - timeframeDurationMs[timeframe]),
        ),
      },
      order: { time: "DESC" },
      take: 100,
    });
  }

  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "ASC",
      },
    });
  }
}
