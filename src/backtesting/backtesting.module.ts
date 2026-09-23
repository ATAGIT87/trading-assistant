import { Module } from "@nestjs/common";
import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsModule } from "../signals/signals.module";
import { BacktestingService } from "./backtesting.service";
import { BacktestingController } from "./backtesting.controller";
import { IndicatorsModule } from "../indicators/indicators.module";

@Module({
  imports: [MarketDataModule, SignalsModule, IndicatorsModule],

  controllers: [BacktestingController],

  providers: [BacktestingService],

  exports: [BacktestingService],
})
export class BacktestingModule {}
