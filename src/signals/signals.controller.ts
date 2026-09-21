import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { SignalsService } from "./signals.service";
import { SignalStorageService } from "./signal-storage.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { SignalResponseSchema } from "./signal-response.schema";

@Controller("signals")
export class SignalsController {
  constructor(
    private readonly signalsService: SignalsService,
    private readonly signalStorageService: SignalStorageService,
  ) {}

  @Get("history/:symbol/:timeframe")
  getSignalHistory(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.signalStorageService.getSignalHistory(symbol, timeframe);
  }

  @Get("latest/:symbol/:timeframe")
  getLatestSignal(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.signalStorageService.getLatestSignal(symbol, timeframe);
  }

  @Get(":symbol/:timeframe/:period")
  async generateSignal(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period", ParseIntPipe) period: number,
  ) {
    const result = await this.signalsService.generateSignal(
      symbol,
      timeframe,
      period,
    );

    return SignalResponseSchema.parse(result);
  }
}
