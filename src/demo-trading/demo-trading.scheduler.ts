import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { getHigherTimeframe } from "../assets/timeframe.utils";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { DemoTradingService } from "./demo-trading.service";
import { TelegramNotificationService } from "./telegram-notification.service";

@Injectable()
export class DemoTradingScheduler {
  private readonly logger = new Logger(DemoTradingScheduler.name);

  private readonly demoMarkets: Array<{
    symbol: string;
    timeframe: Timeframe;
  }> = [
    { symbol: "BTCUSD", timeframe: Timeframe.FIFTEEN_MINUTES },
    { symbol: "ETHUSD", timeframe: Timeframe.FIFTEEN_MINUTES },
  ];

  constructor(
    private readonly demoTradingService: DemoTradingService,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
    private readonly backtestingService: BacktestingService,
    private readonly telegramNotificationService: TelegramNotificationService,
  ) {}

  @Cron("0 */15 * * * *")
  async handleDemoTradingCycle() {
    const runAt = new Date();

    if (!this.telegramNotificationService.isEnabled()) {
      this.logger.warn(
        "Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.",
      );
    }

    for (const market of this.demoMarkets) {
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
      ): entry is (typeof entry & {
        status: "WIN" | "LOSS";
      }) => entry.status === "WIN" || entry.status === "LOSS",
    );

    for (const position of closedPositions) {
      await this.telegramNotificationService.sendCloseNotification(position);
    }

    this.logger.log(
      `[demo-scheduler] tick=${runAt.toISOString()} closed=${closedPositions.length}`,
    );

    for (const market of this.demoMarkets) {
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

      const signal = await this.signalsService.getLiveV2Signal(
        market.symbol,
        market.timeframe,
      );
      const action = signal?.action ?? "NO_TRADE";

      if (action !== "BUY" && action !== "SELL") {
        this.logger.log(
          `[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=false existingClosed=${String(closedPositions.length > 0)}`,
        );
        continue;
      }

      const openResult = await this.demoTradingService.openPosition(
        market.symbol,
        market.timeframe,
      );

      const isDuplicateOpen =
        Boolean(openResult?.position) &&
        openResult?.reason?.includes("Duplicate open demo position");
      const positionOpened =
        Boolean(openResult?.position) && !isDuplicateOpen;

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
}
