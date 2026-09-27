import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { isAllowedSpotEntry } from "../trading/spot-trading-policy";
import {
  getHigherTimeframe,
  isTimeframeBoundary,
} from "../assets/timeframe.utils";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { DemoTradingService } from "./demo-trading.service";
import { TelegramNotificationService } from "./telegram-notification.service";
import { AssetsService } from "../assets/assets.service";

@Injectable()
export class DemoTradingScheduler {
  private readonly logger = new Logger(DemoTradingScheduler.name);

  constructor(
    private readonly demoTradingService: DemoTradingService,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
    private readonly backtestingService: BacktestingService,
    private readonly telegramNotificationService: TelegramNotificationService,
    private readonly assetsService: AssetsService,
    private readonly configService: ConfigService,
  ) {}

  // Run shortly after a candle boundary, when Binance has published the new
  // candle's opening price.  The signal itself still uses closed candles only.
  @Cron("10 */15 * * * *")
  async handleDemoTradingCycle() {
    const runAt = new Date();

    const approvedDemo =
      this.configService.get("DEMO_TRADING_ENABLED", "false") === "true";
    const exploratoryDemo = this.isExploratoryDemoDue(runAt);
    if (!approvedDemo && !exploratoryDemo) {
      this.logger.log(
        "[demo-scheduler] Demo trading is disabled; exploratory Demo is not enabled.",
      );
      return;
    }

    if (!this.telegramNotificationService.isEnabled()) {
      this.logger.warn(
        "Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.",
      );
    }

    const demoMarkets = await this.assetsService.findActiveAssets();
    if (demoMarkets.length === 0) {
      this.logger.warn(
        "[demo-scheduler] no active assets configured; Demo cycle skipped.",
      );
      return;
    }

    for (const market of demoMarkets) {
      await this.marketDataService.syncBinanceCandles(
        market.symbol,
        market.timeframe,
      );
      const higherTimeframe = getHigherTimeframe(market.timeframe);
      if (higherTimeframe !== null) {
        await this.marketDataService.syncBinanceCandles(
          market.symbol,
          higherTimeframe,
        );
      }
    }

    const checkResult = await this.demoTradingService.checkOpenPositions();
    const closedPositions = checkResult.processed.filter(
      (
        entry,
      ): entry is typeof entry & {
        status: "WIN" | "LOSS";
      } => entry.status === "WIN" || entry.status === "LOSS",
    );

    for (const position of closedPositions) {
      await this.telegramNotificationService.sendCloseNotification(position);
    }

    this.logger.log(
      `[demo-scheduler] tick=${runAt.toISOString()} closed=${closedPositions.length}`,
    );

    for (const market of demoMarkets) {
      if (!isTimeframeBoundary(market.timeframe, runAt)) {
        continue;
      }

      if (approvedDemo) {
        const readiness = await this.backtestingService.getReadiness(
          market.symbol,
          market.timeframe,
        );
        if (!readiness.isReady) {
          this.logger.warn(
            `[demo-scheduler] ${market.symbol} / ${market.timeframe} skipped: ${readiness.reason}`,
          );
          continue;
        }
      }

      const signal = await this.signalsService.getLiveV2Signal(
        market.symbol,
        market.timeframe,
      );
      const action = signal?.action ?? "NO_TRADE";

      if (!isAllowedSpotEntry(action)) {
        this.logger.log(
          `[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=false existingClosed=${String(closedPositions.length > 0)}`,
        );
        continue;
      }

      const openResult = await this.demoTradingService.openPosition(
        market.symbol,
        market.timeframe,
        !approvedDemo && exploratoryDemo,
      );

      const isDuplicateOpen =
        Boolean(openResult?.position) &&
        openResult?.reason?.includes("Duplicate open demo position");
      const positionOpened = Boolean(openResult?.position) && !isDuplicateOpen;

      if (positionOpened) {
        await this.telegramNotificationService.sendOpenNotification(
          openResult.position,
          openResult.action,
          signal,
        );
      }

      this.logger.log(
        `[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=${String(positionOpened)} existingClosed=${String(closedPositions.length > 0)}`,
      );
    }
  }

  private isExploratoryDemoDue(now: Date): boolean {
    if (
      this.configService.get("EXPLORATORY_DEMO_ENABLED", "false") !== "true"
    ) {
      return false;
    }

    const start = new Date(
      this.configService.get<string>("EXPLORATORY_DEMO_START_AT", ""),
    );
    return Number.isFinite(start.getTime()) && now.getTime() >= start.getTime();
  }
}
