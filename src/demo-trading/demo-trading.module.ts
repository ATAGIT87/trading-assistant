import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketDataModule } from "../market-data/market-data.module";
import { SignalsModule } from "../signals/signals.module";
import { ConfigModule } from "@nestjs/config";

import { DemoTradingController } from "./demo-trading.controller";
import { DemoTradingScheduler } from "./demo-trading.scheduler";
import { DemoTradingService } from "./demo-trading.service";
import { TelegramNotificationService } from "./telegram-notification.service";
import { DemoPosition } from "./entities/demo-position.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DemoPosition]),
    SignalsModule,
    MarketDataModule,
  ],
  providers: [DemoTradingService, DemoTradingScheduler, TelegramNotificationService],
  controllers: [DemoTradingController],
  exports: [DemoTradingService, TelegramNotificationService],
})
export class DemoTradingModule {}
