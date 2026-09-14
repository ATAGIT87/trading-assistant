import { Module } from "@nestjs/common";
import { SignalsService } from "./signals.service";
import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsController } from "./signals.controller";
import { IndicatorsModule } from "../indicators/indicators.module";

@Module({
  imports: [MarketDataModule, IndicatorsModule],
  providers: [SignalsService],
  exports: [SignalsService],
  controllers: [SignalsController],
})
export class SignalsModule {}
