import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketCandle } from "./entities/market-candle.entity";
import { MarketDataController } from "./market-data.controller";
import { MarketDataProviderService } from "./market-data-provider.service";
import { MarketDataService } from "./market-data.service";
import { MarketCandleStorageService } from "./market-candle-storage.service";

@Module({
  imports: [TypeOrmModule.forFeature([MarketCandle])],
  providers: [
    MarketDataService,
    MarketDataProviderService,
    MarketCandleStorageService,
  ],
  exports: [MarketDataService],
  controllers: [MarketDataController],
})
export class MarketDataModule {}
