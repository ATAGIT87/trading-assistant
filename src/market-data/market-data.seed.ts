import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { Injectable, OnModuleInit } from "@nestjs/common";

@Injectable()
export class MarketDataSeed implements OnModuleInit {
  constructor(
    @InjectRepository(MarketCandle)
    private readonly marketCandleRepository: Repository<MarketCandle>,
  ) {}
  async onModuleInit(): Promise<void> {
    await this.seed();
  }
  async seed(): Promise<void> {
    const candles: Partial<MarketCandle>[] = [];

    let price = 115000;

    for (let i = 0; i < 100; i++) {
      candles.push({
        symbol: "BTCUSD",
        timeframe: Timeframe.ONE_HOUR,
        time: new Date(Date.UTC(2026, 8, 14, i, 0)),
        open: price.toString(),
        high: (price + 1000).toString(),
        low: (price - 1000).toString(),
        close: (price + 100).toString(),
        volume: "100",
      });

    price += i < 50 ? 500 : -500;
    }

    await this.marketCandleRepository.delete({
      symbol: "BTCUSD",
      timeframe: Timeframe.ONE_HOUR,
    });

    await this.marketCandleRepository.save(candles);
  }
}
