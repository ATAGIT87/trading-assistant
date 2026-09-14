import { Controller, Get, Param } from "@nestjs/common";
import { SignalsService } from "./signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Controller("signals")
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

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
