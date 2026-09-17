import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { AlertsService } from "../alerts/alerts.service";

@Injectable()
export class ScannerService {
  constructor(
    private readonly signalsService: SignalsService,
      private readonly alertsService: AlertsService,
    
  ) {}
async scan(
  symbol: string,
  timeframe: Timeframe,
  period = 14,
) {
  const signal =
    await this.signalsService.generateSignal(
      symbol,
      timeframe,
      period,
    );

  if (signal) {
    await this.alertsService.sendSignalAlert(
      symbol,
      timeframe,
      signal,
    );
  }

  return signal;
}
}