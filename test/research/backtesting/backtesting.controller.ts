import { Controller, Get, Param, ParseEnumPipe, Query } from "@nestjs/common";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { StrategyApprovalService } from "../../../src/production/strategy-approval/strategy-approval.service";
import { BacktestingService } from "./backtesting.service";

@Controller("backtesting")
export class BacktestingController {
  constructor(
    private readonly backtesting: BacktestingService,
    private readonly approval: StrategyApprovalService,
  ) {}
  @Get("readiness/:timeframe")
  getReadiness(
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.approval.getReadiness(timeframe);
  }
  @Get("portfolio/:timeframe")
  runPortfolio(
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("includeHoldout") includeHoldout = "false",
  ) {
    return this.backtesting.runPortfolio(timeframe, includeHoldout === "true");
  }
}
