import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
} from "@nestjs/common";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "./trading-symbol";
import { MarketDataService } from "./market-data.service";

/** Operational closed-candle inspection and recovery; strategy diagnosis lives in Signals. */
@Controller("market-data")
export class MarketDataController {
  constructor(private readonly data: MarketDataService) {}

  @Get("candles/:symbol/:timeframe")
  getRecentClosedCandles(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.data.getRecentClosedCandles(symbol, timeframe);
  }

  @Get("candles/:symbol/:timeframe/latest")
  getLatestClosedCandle(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.data.getLatestClosedCandle(symbol, timeframe);
  }

  @Get("candles/:symbol/:timeframe/quality")
  getDataQuality(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.data.getDataQuality(symbol, timeframe);
  }

  @Post("sync-spot/:symbol/:timeframe")
  async syncSpotCandles(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return {
      symbol,
      timeframe,
      saved: await this.data.syncSpotCandles(symbol, timeframe),
    };
  }

  @Post("repair-spot-gaps/:symbol/:timeframe")
  repairSpotGaps(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    if (timeframe === Timeframe.FOUR_HOURS)
      throw new BadRequestException(
        "Derived historical 4h data is rebuilt through the research-data API; repair 1h first.",
      );
    return this.data.repairSpotGaps(symbol, timeframe);
  }
}
