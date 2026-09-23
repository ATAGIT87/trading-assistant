import { Controller, Get, Param, Post } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { DemoTradingService } from "./demo-trading.service";

@Controller("demo-trading")
export class DemoTradingController {
  constructor(private readonly demoTradingService: DemoTradingService) {}

  @Post("open/:symbol/:timeframe")
  async openPosition(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
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
