import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, QueryFailedError } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { Timeframe } from "../assets/enums/timeframe.enum";
@Injectable()
export class MarketDataService {
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

  async findLatestCandle(
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

  async getLatestPrice(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<string | null> {
    const candle = await this.findLatestCandle(symbol, timeframe);

    if (!candle) {
      return null;
    }

    return candle.close;
  }
  getCandlesForAnalysis(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.findCandlesBySymbolAndTimeframe(symbol, timeframe);
  }
}
