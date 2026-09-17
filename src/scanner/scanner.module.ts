import { Module } from "@nestjs/common";
import { ScannerService } from "./scanner.service";
import { ScannerController } from "./scanner.controller";
import { SignalsModule } from "../signals/signals.module";
import { AlertsModule } from "../alerts/alerts.module";

@Module({
  imports: [SignalsModule, AlertsModule],
  providers: [ScannerService],
  controllers: [ScannerController],
})
export class ScannerModule {}