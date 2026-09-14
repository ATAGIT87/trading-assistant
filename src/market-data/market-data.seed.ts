import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketCandle } from './entities/market-candle.entity';
import { Timeframe } from '../assets/enums/timeframe.enum';

@Injectable()
export class MarketDataSeed {
  constructor(
    @InjectRepository(MarketCandle)
    private readonly marketCandleRepository: Repository<MarketCandle>,
  ) {}

  async seed(): Promise<void> {
  const candles: Partial<MarketCandle>[] = [];

  let price = 115000;

  for (let i = 0; i < 20; i++) {
    candles.push({
      symbol: 'BTCUSD',
      timeframe: Timeframe.ONE_HOUR,
      time: new Date(
        Date.UTC(2026, 8, 14, 0, i),
      ),
      open: price.toString(),
      high: (price + 500).toString(),
      low: (price - 500).toString(),
      close: (price + 100).toString(),
      volume: '100',
    });

    price += 100;
  }

  await this.marketCandleRepository.save(candles);
}
}