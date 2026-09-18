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

  private isMarketDataFresh(candleTime: Date, timeframe: Timeframe): boolean {
    const timeframeMs: Record<Timeframe, number> = {
      [Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
      [Timeframe.ONE_HOUR]: 60 * 60 * 1000,
      [Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
      [Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
    };

    const maxAge = timeframeMs[timeframe] * 2;
    const age = Date.now() - candleTime.getTime();

    return age >= 0 && age <= maxAge;
  }
  async scan(symbol: string, timeframe: Timeframe, period = 14) {
    if (timeframe === Timeframe.FIFTEEN_MINUTES) {
      await this.marketDataService.syncBinanceCandles(
        symbol,
        Timeframe.ONE_HOUR,
      );
    }

    await this.marketDataService.syncBinanceCandles(symbol, timeframe);

    if (timeframe === Timeframe.ONE_HOUR) {
      await this.marketDataService.buildFourHourCandles(symbol);
    }

    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    if (candles.length === 0) {
      return null;
    }

    const latestCandle = candles[candles.length - 1];

    if (!this.isMarketDataFresh(latestCandle.time, timeframe)) {
      console.log(
        `[Scanner] Skipping stale market data: ${symbol} / ${timeframe} / ${latestCandle.time.toISOString()}`,
      );

      return null;
    }

    const existingSignal = await this.signalsService.getSignalByCandleTime(
      symbol,
      timeframe,
      latestCandle.time,
    );

    if (existingSignal) {
      return existingSignal;
    }

    const signal = await this.signalsService.generateSignal(
      symbol,
      timeframe,
      period,
    );

    if (!signal) {
      console.log(`[Scanner] ${symbol} / ${timeframe} → NO_SIGNAL`);
      return null;
    }

    console.log(
      `[Scanner] ${symbol} / ${timeframe} → ${signal.action} (confidence: ${signal.confidence})`,
    );

    if (signal.action !== "BUY" && signal.action !== "SELL") {
      return signal;
    }

    await this.alertsService.sendSignalAlert(symbol, timeframe, signal);

    return signal;
  }

  @Cron("*/15 * * * *")
  async scheduledScan() {
    console.log("[Scanner] Scheduled scan started");

    const assets = await this.assetsService.findActiveAssets();

    console.log(`[Scanner] Active assets: ${assets.length}`);

    for (const asset of assets) {
      const now = new Date();

      if (
        asset.timeframe === Timeframe.FIFTEEN_MINUTES &&
        now.getMinutes() % 15 !== 0
      ) {
        continue;
      }

      if (asset.timeframe === Timeframe.ONE_HOUR && now.getMinutes() !== 0) {
        continue;
      }

      if (
        asset.timeframe !== Timeframe.FIFTEEN_MINUTES &&
        asset.timeframe !== Timeframe.ONE_HOUR
      ) {
        console.log(
          `[Scanner] Skipping unsupported scheduled timeframe: ${asset.symbol} / ${asset.timeframe}`,
        );
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
