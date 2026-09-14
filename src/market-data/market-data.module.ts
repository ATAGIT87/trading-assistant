import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketCandle } from './entities/market-candle.entity';

@Module({

  imports: [TypeOrmModule.forFeature([MarketCandle])],

})
export class MarketDataModule {}
