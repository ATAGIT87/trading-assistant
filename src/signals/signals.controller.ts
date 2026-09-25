import { Controller, Get, Param, ParseEnumPipe } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "../market-data/trading-symbol";
import { SignalsService } from "./signals.service";

@Controller("signals")
export class SignalsController {
  constructor(
    private readonly signalsService: SignalsService,
  ) {}

  @Get(":symbol/:timeframe")
  async getLiveV2Signal(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    return this.signalsService.getLiveV2Signal(
      symbol,
      timeframe,
    );
  }
}
