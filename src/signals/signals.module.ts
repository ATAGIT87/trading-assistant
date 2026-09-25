import { Module } from "@nestjs/common";

import { MarketDataModule } from "../market-data/market-data.module";
import { RiskModule } from "../risk/risk.module";
import { SignalsController } from "./signals.controller";
import { SignalsService } from "./signals.service";
import { StrategyV2Service } from "./strategy-v2.service";

@Module({
  imports: [
    MarketDataModule,
    RiskModule,
  ],
  controllers: [SignalsController],
  providers: [
    SignalsService,
    StrategyV2Service,
  ],
  exports: [
    SignalsService,
    StrategyV2Service,
  ],
})
export class SignalsModule {}