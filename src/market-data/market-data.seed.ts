import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { Timeframe } from "../assets/enums/timeframe.enum";

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

    // 1h candles
    for (let i = 0; i < 120; i++) {
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

    // 4h candles created from 1h candles
    const fourHourCandles: Partial<MarketCandle>[] = [];

    for (let i = 0; i < candles.length; i += 4) {
      const group = candles.slice(i, i + 4);

      if (group.length < 4) {
        continue;
      }

      fourHourCandles.push({
        symbol: "BTCUSD",
        timeframe: Timeframe.FOUR_HOURS,
        time: group[0].time,
        open: group[0].open,
        high: Math.max(
          ...group.map((candle) => Number(candle.high)),
        ).toString(),
        low: Math.min(...group.map((candle) => Number(candle.low))).toString(),
        close: group[group.length - 1].close,
        volume: group
          .reduce((sum, candle) => sum + Number(candle.volume), 0)
          .toString(),
      });
    }

    // Clear old seed data
    await this.marketCandleRepository.delete({
      symbol: "BTCUSD",
      timeframe: Timeframe.ONE_HOUR,
    });

    await this.marketCandleRepository.delete({
      symbol: "BTCUSD",
      timeframe: Timeframe.FOUR_HOURS,
    });

    // Save new seed data
    await this.marketCandleRepository.save(candles);
    await this.marketCandleRepository.save(fourHourCandles);
  }
}
