import { AlertDelivery } from "../alerts/entities/alert-delivery.entity";
import { DemoNotificationDeliveryService } from "./demo-notification-delivery.service";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MarketDataModule } from "../market-data/market-data.module";
import { StrategyApprovalModule } from "../strategy-approval/strategy-approval.module";
import { SignalsModule } from "../signals/signals.module";
import { AssetsModule } from "../assets/assets.module";

import { DemoTradingController } from "./demo-trading.controller";
import { DemoTradingScheduler } from "./demo-trading.scheduler";
import { DemoTradingService } from "./demo-trading.service";
import { TelegramNotificationService } from "./telegram-notification.service";
import { DemoPosition } from "./entities/demo-position.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([DemoPosition, AlertDelivery]),
    SignalsModule,
    MarketDataModule,
    StrategyApprovalModule,
    AssetsModule,
  ],
  providers: [
    DemoTradingService,
    DemoTradingScheduler,
    TelegramNotificationService,
    DemoNotificationDeliveryService,
  ],
  controllers: [DemoTradingController],
  exports: [DemoTradingService],
})
export class DemoTradingModule {}
