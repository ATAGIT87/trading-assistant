import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";

@Injectable()
export class MarketDataService {
  constructor(
    @InjectRepository(MarketCandle)
    private readonly marketCandleRepository: Repository<MarketCandle>,
  ) {}

  createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle> {
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

    return this.marketCandleRepository.save(candle);
  }
}
