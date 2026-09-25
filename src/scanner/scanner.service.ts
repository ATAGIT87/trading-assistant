import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { SignalsService } from "../signals/signals.service";
import { MarketDataService } from "../market-data/market-data.service";
import { AlertsService } from "../alerts/alerts.service";
import { AssetsService } from "../assets/assets.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  getHigherTimeframe,
  isTimeframeBoundary,
  timeframeDurationMs,
} from "../assets/timeframe.utils";

@Injectable()
export class ScannerService {
  constructor(
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
    private readonly alertsService: AlertsService,
    private readonly assetsService: AssetsService,
  ) {}

  private isMarketDataFresh(candleTime: Date, timeframe: Timeframe): boolean {
    const maxAge = timeframeDurationMs[timeframe] * 2;
    const age = Date.now() - candleTime.getTime();

    return age >= 0 && age <= maxAge;
  }

  async scan(symbol: string, timeframe: Timeframe) {
    await this.marketDataService.syncBinanceCandles(symbol, timeframe);
    const higherTimeframe = getHigherTimeframe(timeframe);
    if (higherTimeframe !== null) {
      await this.marketDataService.syncBinanceCandles(symbol, higherTimeframe);
    }

    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    if (candles.length === 0) {
      console.log(`[Scanner] ${symbol} / ${timeframe} → NO_CANDLES`);
      return null;
    }

    const latestCandle = candles[candles.length - 1];

    console.log(
      `[Scanner] Latest candle: ${symbol} / ${timeframe} → ${latestCandle.time.toISOString()} | close: ${latestCandle.close}`,
    );

    if (!this.isMarketDataFresh(latestCandle.time, timeframe)) {
      console.log(
        `[Scanner] Skipping stale market data: ${symbol} / ${timeframe} / ${latestCandle.time.toISOString()}`,
      );

      return null;
    }

    const signal = await this.signalsService.getLiveV2Signal(symbol, timeframe);

    if (!signal) {
      console.log(
        `[Scanner] ${symbol} / ${timeframe} → NO_SIGNAL (V2: no completed candles available or no valid setup)`,
      );

      return null;
    }

    if (signal.action === "BUY" || signal.action === "SELL") {
      await this.alertsService.sendSignalAlert(symbol, timeframe, signal);
    }

    console.log(
      `[Scanner] ${symbol} / ${timeframe} → ${signal.action} (signalTime: ${signal.candleTime.toISOString()}, reason: ${signal.reason})`,
    );

    return signal;
  }

  @Cron("*/15 * * * *")
  async scheduledScan() {
    console.log("[Scanner] Scheduled scan started");

    const assets = await this.assetsService.findActiveAssets();

    console.log(`[Scanner] Active assets: ${assets.length}`);

    for (const asset of assets) {
      const now = new Date();

      if (!isTimeframeBoundary(asset.timeframe, now)) {
        continue;
      }

      console.log(`[Scanner] Scanning ${asset.symbol} / ${asset.timeframe}`);

      try {
        await this.scan(asset.symbol, asset.timeframe);
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
