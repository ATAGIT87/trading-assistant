import { Controller, Get, Param, ParseEnumPipe, Query } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "../market-data/trading-symbol";
import { BacktestResponseSchema } from "./backtest-response.schema";
import { BacktestingService } from "./backtesting.service";

@Controller("backtesting")
export class BacktestingController {
  constructor(
    private readonly backtestingService: BacktestingService,
  ) {}

  @Get("history/:symbol/:timeframe")
  async getHistory(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.backtestingService.findRuns(symbol, timeframe);
  }

  @Get("compare/:symbol/:timeframe")
  async compareLatestRuns(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("baseline") baselineVersion = "v2-baseline",
    @Query("candidate") candidateVersion = "v2-baseline",
  ) {
    return this.backtestingService.compareLatestRuns(
      symbol,
      timeframe,
      baselineVersion,
      candidateVersion,
    );
  }

  @Get(":symbol/:timeframe")
  async runBacktest(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    const result = await this.backtestingService.run(symbol, timeframe);

    return BacktestResponseSchema.parse(result);
  }
}
