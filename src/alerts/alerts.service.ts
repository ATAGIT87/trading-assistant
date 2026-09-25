import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { TradingSignal } from "../signals/signal.types";
import { AlertDelivery } from "./entities/alert-delivery.entity";

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertDelivery)
    private readonly alertDeliveryRepository: Repository<AlertDelivery>,
  ) {}

  async sendSignalAlert(
    symbol: string,
    timeframe: Timeframe,
    signal: TradingSignal,
  ): Promise<void> {
    if (signal.action !== "BUY" && signal.action !== "SELL") {
      return;
    }

    const existingDelivery = await this.alertDeliveryRepository.findOne({
      where: {
        symbol,
        timeframe,
        candleTime: signal.candleTime,
        action: signal.action,
      },
    });

    if (existingDelivery) {
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log("Telegram alert skipped: missing configuration.");
      return;
    }

    const message = [
      `🚨 ${signal.action} SIGNAL`,
      ``,
      `Symbol: ${symbol}`,
      `Timeframe: ${timeframe}`,
      `Confidence: ${signal.confidence}%`,
      ``,
      `Entry: ${signal.entryPrice}`,
      `Stop Loss: ${signal.stopLoss}`,
      `Take Profit: ${signal.takeProfit}`,
      ``,
      `Trend: ${signal.trend}`,
      `RSI: ${signal.rsi}`,
      `ADX: ${signal.adx}`,
      `Condition: ${signal.marketCondition}`,
      ``,
      `Reason: ${signal.reason}`,
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();

      throw new Error(`Telegram alert failed: ${response.status} ${errorBody}`);
    }

    await this.alertDeliveryRepository.save(
      this.alertDeliveryRepository.create({
        symbol,
        timeframe,
        candleTime: signal.candleTime,
        action: signal.action,
      }),
    );
  }
}
