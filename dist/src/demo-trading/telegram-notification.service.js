"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramNotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TelegramNotificationService = TelegramNotificationService_1 = class TelegramNotificationService {
    configService;
    logger = new common_1.Logger(TelegramNotificationService_1.name);
    telegramDisabledLogged = false;
    constructor(configService) {
        this.configService = configService;
        if (!this.isEnabled()) {
            this.logger.warn("Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.");
            this.telegramDisabledLogged = true;
        }
    }
    get botToken() {
        return this.configService.get("TELEGRAM_BOT_TOKEN");
    }
    get chatId() {
        return this.configService.get("TELEGRAM_CHAT_ID");
    }
    isEnabled() {
        return Boolean(this.botToken && this.chatId);
    }
    warnIfDisabled() {
        if (!this.isEnabled() && !this.telegramDisabledLogged) {
            this.logger.warn("Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.");
            this.telegramDisabledLogged = true;
        }
    }
    async sendOpenNotification(position, action, signal) {
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
    async sendCloseNotification(position) {
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
    async sendMessage(text) {
        if (!this.isEnabled()) {
            return false;
        }
        const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: this.chatId,
                text,
                parse_mode: "HTML",
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`Telegram send failed: ${response.status} ${errorText}`);
            return false;
        }
        return true;
    }
};
exports.TelegramNotificationService = TelegramNotificationService;
exports.TelegramNotificationService = TelegramNotificationService = TelegramNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TelegramNotificationService);
//# sourceMappingURL=telegram-notification.service.js.map