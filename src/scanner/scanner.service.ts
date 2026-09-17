import { Injectable } from "@nestjs/common";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Injectable()
export class ScannerService {
  constructor(
    private readonly signalsService: SignalsService,
  ) {}

  async scan(
    symbol: string,
    timeframe: Timeframe,
    period = 14,
  ) {
    return this.signalsService.generateSignal(
      symbol,
      timeframe,
      period,
    );
  }
}