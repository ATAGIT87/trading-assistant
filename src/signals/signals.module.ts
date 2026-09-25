import { Module } from "@nestjs/common";

import { MarketDataModule } from "../market-data/market-data.module";
import { IndicatorsModule } from "../indicators/indicators.module";
import { RiskModule } from "../risk/risk.module";
import { SignalsController } from "./signals.controller";
import { SignalsService } from "./signals.service";
import { StrategyV2Service } from "./strategy-v2.service";
import { MarketDataService } from "../market-data/market-data.service";
import { MARKET_DATA_SERVICE } from "./market-data.token";

@Module({
  imports: [
    MarketDataModule,
    IndicatorsModule,
    RiskModule,
  ],
  controllers: [SignalsController],
  providers: [
    {
      provide: MARKET_DATA_SERVICE,
      useExisting: MarketDataService,
    },
    SignalsService,
    StrategyV2Service,
  ],
  exports: [
    SignalsService,
    StrategyV2Service,
  ],
})
export class SignalsModule {}
