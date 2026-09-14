import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { MarketDataService } from "./market-data.service";
import { MarketDataController } from "./market-data.controller";
import { IndicatorsModule } from "../indicators/indicators.module";
import { MarketDataSeed } from "./market-data.seed";

@Module({
  imports: [TypeOrmModule.forFeature([MarketCandle]),IndicatorsModule],
  providers: [MarketDataService, MarketDataSeed],
  exports: [MarketDataService],
  controllers: [MarketDataController],
})
export class MarketDataModule {}
