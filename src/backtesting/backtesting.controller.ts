import { Controller, Get, Param, Query } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestResponseSchema } from "./backtest-response.schema";
import { BacktestingService } from "./backtesting.service";

@Controller("backtesting")
export class BacktestingController {
  constructor(
    private readonly backtestingService: BacktestingService,
  ) {}

  @Get(":symbol/:timeframe")
  async runBacktest(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Query("useHigherTimeframeConfirmation")
    _useHigherTimeframeConfirmation = "false",
    @Query("excludeHighAdxSell")
    _excludeHighAdxSell = "false",
  ) {
    const result =
      await this.backtestingService.run(
        symbol,
        timeframe,
      );

    return BacktestResponseSchema.parse(
      result,
    );
  }
}