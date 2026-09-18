import { Controller, Get, Param } from "@nestjs/common";
import { BacktestingService } from "./backtesting.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestResponseSchema } from "./backtest-response.schema";

@Controller("backtesting")
export class BacktestingController {
  constructor(private readonly backtestingService: BacktestingService) {}

  @Get(":symbol/:timeframe")
  async runBacktest(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    const result = await this.backtestingService.run(symbol, timeframe);

    return result;
  }
}
