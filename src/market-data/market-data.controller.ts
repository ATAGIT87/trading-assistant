import { Controller, Post, Body } from "@nestjs/common";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";

@Controller("market-data")
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post("candles")
  createCandle(@Body() dto: CreateMarketCandleDto) {
    return this.marketDataService.createCandle(dto);
  }
}
