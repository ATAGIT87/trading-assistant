import { Controller, Get, Param } from "@nestjs/common";
import { ParseTradingSymbolPipe } from "../market-data/trading-symbol";
import { TechnicalAnalysisService } from "./technical-analysis.service";

@Controller("technical-analysis")
export class TechnicalAnalysisController {
  constructor(private readonly analysis: TechnicalAnalysisService) {}
  @Get(":symbol")
  analyze(@Param("symbol", ParseTradingSymbolPipe) symbol: string) {
    return this.analysis.analyze(symbol);
  }
}
