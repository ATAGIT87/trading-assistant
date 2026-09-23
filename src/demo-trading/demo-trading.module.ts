import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsModule } from "../signals/signals.module";
import { DemoTradingController } from "./demo-trading.controller";
import { DemoTradingService } from "./demo-trading.service";
import { DemoPosition } from "./entities/demo-position.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DemoPosition]), SignalsModule, MarketDataModule],
  providers: [DemoTradingService],
  controllers: [DemoTradingController],
  exports: [DemoTradingService],
})
export class DemoTradingModule {}
