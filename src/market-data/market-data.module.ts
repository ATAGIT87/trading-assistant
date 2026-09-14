import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { MarketDataService } from "./market-data.service";
import { MarketDataController } from "./market-data.controller";

@Module({
  imports: [TypeOrmModule.forFeature([MarketCandle])],
  providers: [MarketDataService],
  exports: [MarketDataService],
  controllers: [MarketDataController],
})
export class MarketDataModule {}
