import { Module } from "@nestjs/common";
import { SignalsService } from "./signals.service";
import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsController } from "./signals.controller";
import { IndicatorsModule } from "../indicators/indicators.module";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import { MarketDataService } from "../market-data/market-data.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Signal } from "./entities/signal.entity";

@Module({
  imports: [
    MarketDataModule,
    IndicatorsModule,
    TypeOrmModule.forFeature([Signal]),
  ],
  providers: [
    SignalsService,
    {
      provide: MARKET_DATA_SERVICE,
      useExisting: MarketDataService,
    },
  ],
  exports: [SignalsService],
  controllers: [SignalsController],
})
export class SignalsModule {}
