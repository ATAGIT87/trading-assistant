import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SignalsModule } from "../signals/signals.module";
import { StrategyEvidence } from "./entities/strategy-evidence.entity";
import { StrategyApprovalService } from "./strategy-approval.service";

@Module({
  imports: [TypeOrmModule.forFeature([StrategyEvidence]), SignalsModule],
  providers: [StrategyApprovalService],
  exports: [StrategyApprovalService],
})
export class StrategyApprovalModule {}
