import { Controller, Get, Param } from "@nestjs/common";
import { BacktestingService } from "./backtesting.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Controller("backtesting")
export class BacktestingController {
  constructor(private readonly backtestingService: BacktestingService) {}

  @Get(":symbol/:timeframe")
  runBacktest(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.backtestingService.run(symbol, timeframe);
  }
}
