import { Controller, Post, Body, Get, Param } from "@nestjs/common";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Controller("market-data")
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post("candles")
  createCandle(@Body() dto: CreateMarketCandleDto) {
    return this.marketDataService.createCandle(dto);
  }
  @Get("candles")
  findAllCandles() {
    return this.marketDataService.findAllCandles();
  }
  @Get("candles/:symbol")
  findCandlesBySymbol(@Param("symbol") symbol: string) {
    return this.marketDataService.findCandlesBySymbol(symbol);
  }
  @Get("candles/:symbol/:timeframe")
  findCandlesBySymbolAndTimeframe(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.marketDataService.findCandlesBySymbolAndTimeframe(
      symbol,
      timeframe,
    );
  }
  @Get("candles/:symbol/:timeframe/latest")
  findLatestCandle(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.marketDataService.findLatestCandle(symbol, timeframe);
  }
}
