import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseEnumPipe,
  Query,
} from "@nestjs/common";
import { MarketDataProviderService } from "./market-data-provider.service";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseIntPipe } from "@nestjs/common";

@Controller("market-data")
export class MarketDataController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly marketDataProviderService: MarketDataProviderService,
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

  @Get("candles/:symbol/:timeframe/quality")
  getDataQuality(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.marketDataService.getDataQuality(symbol, timeframe);
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
  @Get("candles/:symbol/:timeframe/adx/:period")
  getLatestAdx(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period", ParseIntPipe) period: number,
  ) {
    return this.marketDataService.getLatestAdx(symbol, timeframe, period);
  }

  @Get("spot-candles/:symbol")
  getSpotCandles(@Param("symbol") symbol: string) {
    return this.marketDataProviderService.getSpotCandles(symbol, "1h", 100);
  }

  @Post("sync-spot/:symbol/:timeframe")
  async syncSpotCandles(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    const candles = await this.marketDataProviderService.getSpotCandles(
      symbol,
      timeframe,
      720,
    );

    const savedCount = await this.marketDataService.saveCandles(
      symbol,
      timeframe,
      candles,
    );

    return {
      symbol,
      timeframe,
      received: candles.length,
      saved: savedCount,
    };
  }

  @Post("backfill-spot/:symbol/:timeframe")
  async backfillSpotCandles(
    @Param("symbol") symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
    @Query("days") days = "365",
  ) {
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 30 || parsedDays > 1825) {
      throw new BadRequestException(
        "days must be an integer between 30 and 1825.",
      );
    }

    return this.marketDataService.backfillSpotCandles(
      symbol,
      timeframe,
      parsedDays,
    );
  }

  @Post("repair-spot-gaps/:symbol/:timeframe")
  async repairSpotGaps(
    @Param("symbol") symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    if (timeframe === Timeframe.FOUR_HOURS) {
      throw new BadRequestException(
        "4h candles are derived from 1h data; repair 1h first, then rebuild 4h.",
      );
    }

    return this.marketDataService.repairSpotGaps(symbol, timeframe);
  }

  @Post("build-4h/:symbol")
  async buildFourHourCandles(@Param("symbol") symbol: string) {
    const saved = await this.marketDataService.buildFourHourCandles(symbol);

    return {
      symbol,
      timeframe: "4h",
      saved,
    };
  }
}
