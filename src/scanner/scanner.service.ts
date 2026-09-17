import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
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

  @Cron("0 * * * *")
  async scheduledScan() {
    await this.scan(
      "BTCUSD",
      Timeframe.ONE_HOUR,
    );
  }
}