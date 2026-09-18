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

  async scan(
  symbol: string,
  timeframe: Timeframe,
  period = 14,
) {
  if (timeframe === Timeframe.FIFTEEN_MINUTES) {
  await this.marketDataService.syncBinanceCandles(
    symbol,
    Timeframe.ONE_HOUR,
  );
}
  await this.marketDataService.syncBinanceCandles(
    symbol,
    timeframe,
  );

  if (timeframe === Timeframe.ONE_HOUR) {
    await this.marketDataService.buildFourHourCandles(
      symbol,
    );
  }

  const candles =
    await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

  if (candles.length === 0) {
    return null;
  }

  const latestCandle =
    candles[candles.length - 1];

  const existingSignal =
    await this.signalsService.getSignalByCandleTime(
      symbol,
      timeframe,
      latestCandle.time,
    );

  const signal =
    await this.signalsService.generateSignal(
      symbol,
      timeframe,
      period,
    );

  if (!signal) {
    return null;
  }

  if (
    existingSignal ||
    (signal.action !== "BUY" &&
      signal.action !== "SELL")
  ) {
    return signal;
  }

  await this.alertsService.sendSignalAlert(
    symbol,
    timeframe,
    signal,
  );

  return signal;
}

  @Cron("*/15 * * * *")
async scheduledScan() {
  console.log("[Scanner] Scheduled scan started");

  const assets =
    await this.assetsService.findActiveAssets();

  console.log(
    `[Scanner] Active assets: ${assets.length}`,
  );

  for (const asset of assets) {
    const now = new Date();

    if (
      asset.timeframe === Timeframe.FIFTEEN_MINUTES &&
      now.getMinutes() % 15 !== 0
    ) {
      continue;
    }

    if (
      asset.timeframe === Timeframe.ONE_HOUR &&
      now.getMinutes() !== 0
    ) {
      continue;
    }

    console.log(
      `[Scanner] Scanning ${asset.symbol} / ${asset.timeframe}`,
    );

    try {
      await this.scan(
        asset.symbol,
        asset.timeframe,
      );
    } catch (error) {
      console.error(
        `[Scanner] Failed ${asset.symbol} / ${asset.timeframe}`,
        error,
      );
    }
  }

  console.log("[Scanner] Scheduled scan finished");
}
}
