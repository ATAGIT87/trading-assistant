import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketDataModule } from "../../../src/production/market-data/market-data.module";
import { SignalsModule } from "../../../src/production/signals/signals.module";
import { BacktestingController } from "./backtesting.controller";
import { BacktestingService } from "./backtesting.service";
import { StrategyEvidence } from "../../../src/production/strategy-approval/entities/strategy-evidence.entity";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { ResearchMarketDataService } from "../data/research-market-data.service";
import { ResearchMarketDataController } from "../data/research-market-data.controller";

import { StrategyApprovalModule } from "../../../src/production/strategy-approval/strategy-approval.module";
import { IndicatorsModule } from "../indicators/indicators.module";
import { RiskModule } from "../../../src/production/risk/risk.module";
import { ResearchStrategyRegistryService } from "../strategies/research-strategy-registry.service";
import { HourlyFourHourVolumeResearchStrategy } from "../strategies/hourly-four-hour-volume-research.strategy";
import { HourlyProfitExitResearchStrategy } from "../strategies/hourly-profit-exit-research.strategy";
import { HourlyTechnicalQualityResearchStrategy } from "../strategies/hourly-technical-quality-research.strategy";
import { HourlySetupStructureResearchStrategy } from "../strategies/hourly-setup-structure-research.strategy";
import { HourlyIntegratedSpotResearchStrategy } from "../strategies/hourly-integrated-spot-research.strategy";
import { TechnicalTrendEngine } from "../strategies/technical-trend-engine";

import { EmaRsiReplayStrategy } from "../strategies/ema-rsi-replay.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyEvidence, MarketCandle]),
    MarketDataModule,
    SignalsModule,
    StrategyApprovalModule,
    IndicatorsModule,
    RiskModule,
  ],
  controllers: [BacktestingController, ResearchMarketDataController],
  providers: [
    ResearchMarketDataService,
    EmaRsiReplayStrategy,
    BacktestingService,
    ResearchStrategyRegistryService,
    HourlyFourHourVolumeResearchStrategy,
    HourlyProfitExitResearchStrategy,
    HourlyTechnicalQualityResearchStrategy,
    HourlySetupStructureResearchStrategy,
    HourlyIntegratedSpotResearchStrategy,
    TechnicalTrendEngine,
  ],
  exports: [BacktestingService],
})
export class BacktestingModule {}
