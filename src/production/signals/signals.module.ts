import { Module } from "@nestjs/common";
import { RiskModule } from "../risk/risk.module";
import { EmaRsiSpotStrategy } from "../trading/ema-rsi-spot.strategy";
import { MarketAnalysisService } from "../trading/ccxt/market-analysis.service";
import { SignalsController } from "./signals.controller";
import { SignalsService } from "./signals.service";
import { StrategyRegistryService } from "./strategy-registry.service";
import { TechnicalAnalysisController } from "./technical-analysis.controller";
import { TechnicalAnalysisService } from "./technical-analysis.service";

@Module({
  imports: [RiskModule],
  controllers: [SignalsController, TechnicalAnalysisController],
  providers: [
    SignalsService,
    MarketAnalysisService,
    EmaRsiSpotStrategy,
    TechnicalAnalysisService,
    StrategyRegistryService,
  ],
  exports: [SignalsService, StrategyRegistryService],
})
export class SignalsModule {}
