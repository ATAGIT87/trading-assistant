import { SignalsModule } from "../../signals/signals.module";
import { AssetsModule } from "../../assets/assets.module";
import { Controller, Get, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertDelivery } from "../../alerts/entities/alert-delivery.entity";
import { DemoTradingModule } from "../../demo-trading/demo-trading.module";
import { RunTradingAssistant } from "./run-trading-assistant";

@Controller("trading-assistant")
export class TradingAssistantController {
  constructor(private readonly assistant: RunTradingAssistant) {}
  @Get("status") status() {
    return this.assistant.status();
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertDelivery]),
    DemoTradingModule,
    SignalsModule,
    AssetsModule,
  ],
  providers: [RunTradingAssistant],
  controllers: [TradingAssistantController],
})
export class TradingAssistantModule {}
