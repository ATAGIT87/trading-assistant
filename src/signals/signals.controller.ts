import { Controller, Get, Param } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { SignalsService } from "./signals.service";

@Controller("signals")
export class SignalsController {
  constructor(
    private readonly signalsService: SignalsService,
  ) {}

  @Get(":symbol/:timeframe")
  async getLiveV2Signal(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.signalsService.getLiveV2Signal(
      symbol,
      timeframe,
    );
  }
}