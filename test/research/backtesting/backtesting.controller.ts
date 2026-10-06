import { Controller, Get, Param, ParseEnumPipe, Query } from "@nestjs/common";

import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "../../../src/production/market-data/trading-symbol";
import { BacktestResponseSchema } from "./backtest-response.schema";
import { BacktestingService } from "./backtesting.service";
import { StrategyApprovalService } from "../../../src/production/strategy-approval/strategy-approval.service";

@Controller("backtesting")
export class BacktestingController {
  constructor(
    private readonly backtestingService: BacktestingService,
    private readonly approval: StrategyApprovalService,
  ) {}

  @Get("history/:symbol/:timeframe")
  async getHistory(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.backtestingService.findRuns(symbol, timeframe);
  }

  @Get("readiness/:timeframe")
  async getReadiness(
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.approval.getReadiness(timeframe);
  }

  @Get("compare/:symbol/:timeframe")
  async compareLatestRuns(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("baseline") baselineVersion = "ccxt-ema50-rsi14-v1",
    @Query("candidate") candidateVersion = "ccxt-ema50-rsi14-v1",
  ) {
    return this.backtestingService.compareLatestRuns(
      symbol,
      timeframe,
      baselineVersion,
      candidateVersion,
    );
  }

  @Get("portfolio/:timeframe")
  async runPortfolioBacktest(
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("strategy") strategyVersion?: string,
  ) {
    return this.backtestingService.runPortfolio(timeframe, strategyVersion);
  }

  @Get("walk-forward/portfolio/:timeframe")
  async runWalkForwardPortfolio(
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("strategy") strategyVersion?: string,
  ) {
    return this.backtestingService.runWalkForwardPortfolio(
      timeframe,
      strategyVersion,
    );
  }

  @Get(":symbol/:timeframe")
  async runBacktest(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("strategy") strategyVersion?: string,
    @Query("includeHoldout") includeHoldout = "false",
  ) {
    const result = await this.backtestingService.run(
      symbol,
      timeframe,
      strategyVersion,
      includeHoldout === "true",
    );

    return BacktestResponseSchema.parse(result);
  }
}
