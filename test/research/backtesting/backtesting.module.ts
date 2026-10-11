import { Module } from "@nestjs/common";
import { MarketDataModule } from "../../../src/production/market-data/market-data.module";
import { StrategyApprovalModule } from "../../../src/production/strategy-approval/strategy-approval.module";
import { RiskModule } from "../../../src/production/risk/risk.module";
import { EmaRsiReplayStrategy } from "../strategies/ema-rsi-replay.strategy";
import { BacktestingController } from "./backtesting.controller";
import { BacktestingService } from "./backtesting.service";

@Module({
  imports: [MarketDataModule, StrategyApprovalModule, RiskModule],
  controllers: [BacktestingController],
  providers: [EmaRsiReplayStrategy, BacktestingService],
  exports: [BacktestingService],
})
export class BacktestingModule {}
