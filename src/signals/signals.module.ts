import { Module } from "@nestjs/common";

import { MarketDataModule } from "../market-data/market-data.module";
import { IndicatorsModule } from "../indicators/indicators.module";
import { RiskModule } from "../risk/risk.module";
import { SignalsController } from "./signals.controller";
import { SignalsService } from "./signals.service";
import { StrategyRegistryService } from "./strategy-registry.service";
import { MarketDataService } from "../market-data/market-data.service";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import { ExploratoryHourlyBreakoutStrategy } from "../trading/exploratory-hourly-breakout.strategy";

@Module({
  imports: [MarketDataModule, IndicatorsModule, RiskModule],
  controllers: [SignalsController],
  providers: [
    {
      provide: MARKET_DATA_SERVICE,
      useExisting: MarketDataService,
    },
    SignalsService,
    StrategyRegistryService,
    ExploratoryHourlyBreakoutStrategy,
  ],
  exports: [SignalsService, StrategyRegistryService],
})
export class SignalsModule {}
