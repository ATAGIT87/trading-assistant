import { Controller, Get, Param, ParseEnumPipe, Post } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "../market-data/trading-symbol";
import { DemoTradingService } from "./demo-trading.service";

@Controller("demo-trading")
export class DemoTradingController {
  constructor(private readonly demoTradingService: DemoTradingService) {}

  @Post("open/:symbol/:timeframe")
  async openPosition(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.demoTradingService.openPosition(symbol, timeframe);
  }

  @Get("open")
  async getOpenPositions() {
    return {
      openPositions: await this.demoTradingService.getOpenPositions(),
    };
  }

  @Post("check")
  async checkOpenPositions() {
    return this.demoTradingService.checkOpenPositions();
  }

  @Get("history")
  async getHistory() {
    const positions = await this.demoTradingService.getHistory();

    return {
      closedPositions: positions.map((position) => ({
        result: position.status,
        entry: position.entry,
        exitPrice: position.exitPrice,
        resultR: position.resultR,
        openedAt: position.openedAt,
        closedAt: position.closedAt,
        symbol: position.symbol,
        timeframe: position.timeframe,
        side: position.side,
      })),
    };
  }
}
