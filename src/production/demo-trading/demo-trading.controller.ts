import { Controller, Get, Param, ParseEnumPipe, Post } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "../market-data/trading-symbol";
import { DemoTradingService } from "./demo-trading.service";
import { getDemoPositionResult } from "./demo-position-result";

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
      closedPositions: positions.map((position) => {
        const result = getDemoPositionResult(position);
        return {
          result: result.netResult,
          storedStatus: position.status,
          entry: position.entry,
          exitPrice: position.exitPrice,
          resultR: result.resultR,
          grossResultR: result.grossResultR,
          storedResultR: position.resultR,
          maximumFavorableR: position.maximumFavorableR,
          maximumAdverseR: position.maximumAdverseR,
          realizedPnlQuote: position.realizedPnlQuote,
          riskBudgetQuote: position.riskBudgetQuote,
          plannedRiskQuote: position.plannedRiskQuote,
          entryFee: position.entryFee,
          exitFee: position.exitFee,
          entrySlippage: position.entrySlippage,
          exitSlippage: position.exitSlippage,
          exitReason: position.exitReason,
          openedAt: position.openedAt,
          closedAt: position.closedAt,
          symbol: position.symbol,
          timeframe: position.timeframe,
          side: position.side,
          mode: position.mode,
          strategyVersion: position.strategyVersion,
        };
      }),
    };
  }

  @Get("summary")
  async getSummary() {
    return this.demoTradingService.getSummary();
  }
}
