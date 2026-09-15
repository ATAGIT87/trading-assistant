import { Controller, Post, Body, Get, Param } from "@nestjs/common";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketDataSeed } from "./market-data.seed";

@Controller("market-data")
export class MarketDataController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly marketDataSeed: MarketDataSeed,
  ) {}

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

  @Post("seed")
  seed() {
    return this.marketDataSeed.seed();
  }

  @Get("candles/:symbol/:timeframe/rsi")
  getLatestRsi(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.marketDataService.getLatestRsi(symbol, timeframe);
  }

  @Get("candles/:symbol/:timeframe/sma/:period")
  getLatestSma(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.getLatestSma(
      symbol,
      timeframe,
      Number(period),
    );
  }

  @Get("candles/:symbol/:timeframe/ema/:period")
  getLatestEma(
    @Param("symbol") symbol: string,
    @Param("period") period: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.marketDataService.getLatestEma(
      symbol,
      timeframe,
      Number(period),
    );
  }

  @Get("candles/:symbol/:timeframe/price-vs-sma/:period")
  compareLatestPriceToSma(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.compareLatestPriceToSma(
      symbol,
      timeframe,
      Number(period),
    );
  }
  @Get("candles/:symbol/:timeframe/price-vs-ema/:period")
  compareLatestPriceToEma(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.compareLatestPriceToEma(
      symbol,
      timeframe,
      Number(period),
    );
  }
  @Get("candles/:symbol/:timeframe/sma-vs-ema/:period")
  compareSmaToEma(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.compareSmaToEma(
      symbol,
      timeframe,
      Number(period),
    );
  }

  @Get("candles/:symbol/:timeframe/trend/:period")
  getTrend(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.getTrend(symbol, timeframe, Number(period));
  }
  @Get("candles/:symbol/:timeframe/rsi-status/:period")
  getRsiStatus(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.getRsiStatus(
      symbol,
      timeframe,
      Number(period),
    );
  }

  @Get("candles/:symbol/:timeframe/market-condition/:period")
  getMarketCondition(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.getMarketCondition(
      symbol,
      timeframe,
      Number(period),
    );
  }
  @Get("candles/:symbol/:timeframe/atr/:period")
  getLatestAtr(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.marketDataService.getLatestAtr(
      symbol,
      timeframe,
      Number(period),
    );
  }
}
