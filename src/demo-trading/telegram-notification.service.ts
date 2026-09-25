import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { TradingSignal } from "../signals/signal.types";

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private telegramDisabledLogged = false;

  constructor(private readonly configService: ConfigService) {
    if (!this.isEnabled()) {
      this.logger.warn(
        "Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.",
      );
      this.telegramDisabledLogged = true;
    }
  }

  private get botToken(): string | undefined {
    return this.configService.get<string>("TELEGRAM_BOT_TOKEN");
  }

  private get chatId(): string | undefined {
    return this.configService.get<string>("TELEGRAM_CHAT_ID");
  }

  isEnabled(): boolean {
    return Boolean(this.botToken && this.chatId);
  }

  private warnIfDisabled(): void {
    if (!this.isEnabled() && !this.telegramDisabledLogged) {
      this.logger.warn(
        "Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.",
      );
      this.telegramDisabledLogged = true;
    }
  }

  async sendOpenNotification(
    position: { symbol: string; timeframe: string; side: string; entry: number; stopLoss: number; takeProfit: number; riskReward: number | null } | null,
    action: string,
    signal: TradingSignal | null,
  ): Promise<boolean> {
    if (!this.isEnabled() || !position || !signal) {
      this.warnIfDisabled();
      return false;
    }

    const message = [
      "🚨 V2 DEMO SIGNAL",
      "",
      `${position.symbol} ${position.timeframe}`,
      "",
      action,
      "",
      `Entry: ${signal.entryPrice.toFixed(2)}`,
      `SL: ${Number(signal.stopLoss ?? position.stopLoss).toFixed(2)}`,
      `TP: ${Number(signal.takeProfit ?? position.takeProfit).toFixed(2)}`,
      `R:R: ${position.riskReward ?? 0}:${1}`,
      "",
      "Status: OPEN",
    ].join("\n");

    return this.sendMessage(message);
  }

  async sendCloseNotification(position: {
    symbol: string;
    timeframe: string;
    side: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    status: "WIN" | "LOSS";
    exitPrice: number | null;
    resultR: number | null;
  }): Promise<boolean> {
    if (!this.isEnabled()) {
      this.warnIfDisabled();
      return false;
    }

    const isWin = position.status === "WIN";
    const message = [
      isWin ? "✅ V2 DEMO WIN" : "❌ V2 DEMO LOSS",
      "",
      `${position.symbol} ${position.timeframe}`,
      "",
      position.side,
      "",
      `Entry: ${Number(position.entry).toFixed(2)}`,
      `Exit: ${Number(position.exitPrice ?? position.takeProfit ?? position.stopLoss).toFixed(2)}`,
      `Result: ${isWin ? "+1R" : "-1R"}`,
    ].join("\n");

    return this.sendMessage(message);
  }

  private async sendMessage(text: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Telegram send failed: ${response.status} ${errorText}`,
      );
      return false;
    }

    return true;
  }
}
