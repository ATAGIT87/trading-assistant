import { Module } from "@nestjs/common";
import { ScannerService } from "./scanner.service";
import { ScannerController } from "./scanner.controller";
import { SignalsModule } from "../signals/signals.module";

@Module({
  imports: [SignalsModule],
  providers: [ScannerService],
  controllers: [ScannerController],
})
export class ScannerModule {}