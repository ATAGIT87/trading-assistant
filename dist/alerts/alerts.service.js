"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
let AlertsService = class AlertsService {
    async sendSignalAlert(symbol, timeframe, signal) {
        if (signal.action !== "BUY" &&
            signal.action !== "SELL") {
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
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Telegram alert failed: ${response.status} ${errorBody}`);
        }
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)()
], AlertsService);
//# sourceMappingURL=alerts.service.js.map