import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SignalsService } from "../signals/signals.service";
import { MarketDataService } from "../market-data/market-data.service";
import { AlertsService } from "../alerts/alerts.service";
import { AssetsService } from "../assets/assets.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Injectable()
export class ScannerService {
  constructor(
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
    private readonly alertsService: AlertsService,
    private readonly assetsService: AssetsService,
  ) {}

  async scan(symbol: string, timeframe: Timeframe, period = 14) {
    await this.marketDataService.syncBinanceCandles(symbol, timeframe);

    if (timeframe === Timeframe.ONE_HOUR) {
      await this.marketDataService.buildFourHourCandles(symbol);
    }

    const signal = await this.signalsService.generateSignal(
      symbol,
      timeframe,
      period,
    );

    if (!signal) {
      return null;
    }

    if (signal.action !== "BUY" && signal.action !== "SELL") {
      return signal;
    }

    const latestSignal = await this.signalsService.getLatestSignal(
      symbol,
      timeframe,
    );

    if (
      latestSignal &&
      latestSignal.action === signal.action &&
      Number(latestSignal.entryPrice) === Number(signal.entryPrice)
    ) {
      return signal;
    }

    await this.alertsService.sendSignalAlert(symbol, timeframe, signal);

    return signal;
  }

  @Cron("0 * * * *")
  async scheduledScan() {
    console.log("[Scanner] Scheduled scan started");

    const assets = await this.assetsService.findActiveAssets();

    console.log(`[Scanner] Active assets: ${assets.length}`);

    for (const asset of assets) {
      console.log(`[Scanner] Scanning ${asset.symbol} / ${asset.timeframe}`);

      await this.scan(asset.symbol, asset.timeframe);
    }

    console.log("[Scanner] Scheduled scan finished");
  }
}
