import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { classifyNetResult } from "../trading/net-trade-result";

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
    position: {
      id?: number;
      strategyVersion?: string | null;
      symbol: string;
      timeframe: string;
      side: string;
      entry: number;
      stopLoss: number;
      takeProfit: number;
      riskReward: number | null;
      mode?: "APPROVED" | "EXPERIMENTAL";
    } | null,
    action: string,
    context?: { reason: string; currentPrice?: number } | null,
  ): Promise<boolean> {
    if (!this.isEnabled() || !position) {
      this.warnIfDisabled();
      return false;
    }

    const message = [
      position.mode === "EXPERIMENTAL"
        ? "🧪 EXPERIMENTAL SPOT DEMO BUY"
        : "🚨 SPOT DEMO BUY",
      "",
      `${position.symbol} ${position.timeframe}`,
      `Demo ID: ${position.id ?? "N/A"}`,
      `Strategy: ${position.strategyVersion ?? "legacy"}`,
      "",
      action,
      "",
      `Entry: ${Number(position.entry).toFixed(2)}`,
      `SL: ${Number(position.stopLoss).toFixed(2)}`,
      `TP: ${Number(position.takeProfit).toFixed(2)}`,
      `R:R: ${position.riskReward ?? 0}:${1}`,
      "",
      ...(context
        ? [
            `Reason: ${context.reason}`,
            `Observed current price: ${context.currentPrice ?? "unavailable"}`,
          ]
        : []),
      "Status: OPEN",
    ].join("\n");

    return this.sendMessage(message);
  }

  async sendCloseNotification(position: {
    id?: number;
    strategyVersion?: string | null;
    symbol: string;
    timeframe: string;
    side: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    status: "WIN" | "LOSS";
    exitPrice: number | null;
    resultR: number | null;
    realizedPnlQuote?: number | null;
    exitReason?:
      "STOP_LOSS" | "TAKE_PROFIT" | "PROFIT_PROTECTION" | "TIME_EXIT" | null;
    mode?: "APPROVED" | "EXPERIMENTAL";
  }): Promise<boolean> {
    if (!this.isEnabled()) {
      this.warnIfDisabled();
      return false;
    }

    const netResult =
      position.realizedPnlQuote == null
        ? position.status
        : classifyNetResult(Number(position.realizedPnlQuote));
    const message = [
      position.mode === "EXPERIMENTAL"
        ? `🧪 EXPERIMENTAL DEMO ${netResult}`
        : `SPOT DEMO ${netResult}`,
      "",
      `${position.symbol} ${position.timeframe}`,
      `Demo ID: ${position.id ?? "N/A"}`,
      `Strategy: ${position.strategyVersion ?? "legacy"}`,
      "",
      position.side,
      "",
      `Entry: ${Number(position.entry).toFixed(2)}`,
      `Exit: ${Number(position.exitPrice ?? position.takeProfit ?? position.stopLoss).toFixed(2)}`,
      `Net result: ${this.formatResultR(position.resultR)}`,
      `Net P/L: ${position.realizedPnlQuote == null ? "N/A" : (Number(position.realizedPnlQuote) >= 0 ? "+" : "") + Number(position.realizedPnlQuote).toFixed(2) + " EUR"}`,
      `Exit reason: ${position.exitReason ?? "UNKNOWN"}`,
    ].join("\n");

    return this.sendMessage(message);
  }

  private formatResultR(resultR: number | null): string {
    if (resultR === null) return "N/A";
    const value = Number(resultR);
    return `${value >= 0 ? "+" : ""}${value.toFixed(4)}R`;
  }

  private async sendMessage(text: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: "POST",
          signal: AbortSignal.timeout(10_000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: this.chatId, text }),
        },
      );
      if (!response.ok) {
        this.logger.warn(`Telegram send failed with HTTP ${response.status}.`);
        return false;
      }
      const body = (await response.json()) as { ok?: boolean };
      if (body.ok !== true) {
        this.logger.warn("Telegram did not acknowledge the message.");
        return false;
      }
    } catch {
      this.logger.warn("Telegram transport failed; delivery can be retried.");
      return false;
    }

    return true;
  }
}
