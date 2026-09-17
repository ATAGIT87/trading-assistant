import { Module } from "@nestjs/common";
import { ScannerController } from "./scanner.controller";
import { ScannerService } from "./scanner.service";
import { SignalsModule } from "../signals/signals.module";
import { AlertsModule } from "../alerts/alerts.module";
import { MarketDataModule } from "../market-data/market-data.module";
import { AssetsModule } from "../assets/assets.module";

@Module({
  imports: [
    SignalsModule,
    AlertsModule,
    MarketDataModule,
    AssetsModule,
  ],
  providers: [ScannerService],
  controllers: [ScannerController],
})
export class ScannerModule {}