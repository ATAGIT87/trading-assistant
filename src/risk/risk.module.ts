import { Module } from "@nestjs/common";

import { RiskManagerService } from "./risk-manager.service";

@Module({
  providers: [RiskManagerService],
  exports: [RiskManagerService],
})
export class RiskModule {}