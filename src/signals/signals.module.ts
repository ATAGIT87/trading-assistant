import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketDataModule } from "../market-data/market-data.module";
import { IndicatorsModule } from "../indicators/indicators.module";
import { Signal } from "./entities/signal.entity";
import { SignalsService } from "./signals.service";
import { SignalsController } from "./signals.controller";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalStorageService } from "./signal-storage.service";
import { SignalCalculationService } from "./signal-calculation.service";
import { SignalTimeframeService } from "./signal-timeframe.service";
import { StrategyV2Service } from "./strategy-v2.service";

@Module({
  imports: [
    MarketDataModule,
    IndicatorsModule,
    TypeOrmModule.forFeature([Signal]),
  ],
  providers: [
    SignalsService,
    SignalStorageService,
    SignalCalculationService,
    SignalTimeframeService,
    StrategyV2Service,
    {
      provide: MARKET_DATA_SERVICE,
      useExisting: MarketDataService,
    },
  ],
  exports: [SignalsService, StrategyV2Service],
  controllers: [SignalsController],
})
export class SignalsModule {}
