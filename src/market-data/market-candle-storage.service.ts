import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, QueryFailedError, Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";

@Injectable()
export class MarketCandleStorageService {
  constructor(
    @InjectRepository(MarketCandle)
    private readonly marketCandleRepository: Repository<MarketCandle>,
  ) {}

  async createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle> {
    try {
      const candle = this.marketCandleRepository.create({
        symbol: dto.symbol,
        timeframe: dto.timeframe,
        time: new Date(dto.time),
        open: dto.open.toString(),
        high: dto.high.toString(),
        low: dto.low.toString(),
        close: dto.close.toString(),
        volume: dto.volume.toString(),
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

  findAllCandles(): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find();
  }

  findCandlesBySymbol(symbol: string): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
      },
    });
  }

  findCandlesBySymbolAndTimeframe(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "DESC",
      },
      take: 100,
    });
  }

  findLatestCandle(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle | null> {
    return this.marketCandleRepository.findOne({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "DESC",
      },
    });
  }

  getCandlesForAnalysis(
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

  getHistoricalCandlesUntil(
    symbol: string,
    timeframe: Timeframe,
    until: Date,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
        time: LessThanOrEqual(until),
      },
      order: {
        time: "ASC",
      },
    });
  }

  async deleteFourHourCandles(symbol: string): Promise<void> {
    await this.marketCandleRepository.delete({
      symbol,
      timeframe: Timeframe.FOUR_HOURS,
    });
  }

  async saveCandles(candles: MarketCandle[]): Promise<MarketCandle[]> {
    return this.marketCandleRepository.save(candles);
  }
}
