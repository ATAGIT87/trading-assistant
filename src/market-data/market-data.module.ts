import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketCandle } from "./entities/market-candle.entity";
import { MarketDataController } from "./market-data.controller";
import { MarketDataProviderService } from "./market-data-provider.service";
import { MarketDataService } from "./market-data.service";
import { MarketCandleStorageService } from "./market-candle-storage.service";
import { MarketDataAnalysisService } from "./market-data-analysis.service";
import { IndicatorsModule } from "../indicators/indicators.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketCandle]),
    IndicatorsModule,
  ],
  providers: [
    MarketDataService,
    MarketDataProviderService,
    MarketCandleStorageService,
    MarketDataAnalysisService,
  ],
  exports: [
    MarketDataService,
    MarketDataProviderService,
  ],
  controllers: [
    MarketDataController,
  ],
})
export class MarketDataModule {}