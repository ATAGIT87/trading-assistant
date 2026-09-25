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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const alert_delivery_entity_1 = require("./entities/alert-delivery.entity");
let AlertsService = class AlertsService {
    alertDeliveryRepository;
    constructor(alertDeliveryRepository) {
        this.alertDeliveryRepository = alertDeliveryRepository;
    }
    async sendSignalAlert(symbol, timeframe, signal) {
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
        await this.alertDeliveryRepository.save(this.alertDeliveryRepository.create({
            symbol,
            timeframe,
            candleTime: signal.candleTime,
            action: signal.action,
        }));
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(alert_delivery_entity_1.AlertDelivery)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map