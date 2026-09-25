import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsModule } from "../signals/signals.module";
import { BacktestingController } from "./backtesting.controller";
import { BacktestingService } from "./backtesting.service";
import { BacktestRun } from "./entities/backtest-run.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([BacktestRun]),
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
