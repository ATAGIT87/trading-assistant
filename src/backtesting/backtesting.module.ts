import { Module } from "@nestjs/common";

import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsModule } from "../signals/signals.module";
import { BacktestingController } from "./backtesting.controller";
import { BacktestingService } from "./backtesting.service";

@Module({
  imports: [
    MarketDataModule,
    SignalsModule,
  ],
  controllers: [
    BacktestingController,
  ],
  providers: [
    BacktestingService,
  ],
  exports: [
    BacktestingService,
  ],
})
export class BacktestingModule {}