import { Controller, Get, Param } from "@nestjs/common";
import { SignalsService } from "./signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Controller("signals")
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get("history/:symbol/:timeframe")
  getSignalHistory(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.signalsService.getSignalHistory(symbol, timeframe);
  }

  @Get("latest/:symbol/:timeframe")
  getLatestSignal(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.signalsService.getLatestSignal(symbol, timeframe);
  }

  @Get(":symbol/:timeframe/:period")
  generateSignal(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period") period: string,
  ) {
    return this.signalsService.generateSignal(
      symbol,
      timeframe,
      Number(period),
    );
  }
}
