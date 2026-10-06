import { Controller, Param, Post } from "@nestjs/common";
import { ParseTradingSymbolPipe } from "../../../src/production/market-data/trading-symbol";
import { ResearchMarketDataService } from "./research-market-data.service";

@Controller("research-data")
export class ResearchMarketDataController {
  constructor(private readonly data: ResearchMarketDataService) {}

  @Post("build-4h/:symbol")
  async buildFourHourCandles(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
  ) {
    return {
      symbol,
      timeframe: "4h",
      saved: await this.data.buildFourHourCandles(symbol),
    };
  }
}
