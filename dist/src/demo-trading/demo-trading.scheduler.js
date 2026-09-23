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
var DemoTradingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoTradingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const signals_service_1 = require("../signals/signals.service");
const demo_trading_service_1 = require("./demo-trading.service");
const telegram_notification_service_1 = require("./telegram-notification.service");
let DemoTradingScheduler = DemoTradingScheduler_1 = class DemoTradingScheduler {
    demoTradingService;
    signalsService;
    telegramNotificationService;
    logger = new common_1.Logger(DemoTradingScheduler_1.name);
    demoMarkets = [
        { symbol: "BTCUSD", timeframe: timeframe_enum_1.Timeframe.FIFTEEN_MINUTES },
        { symbol: "ETHUSD", timeframe: timeframe_enum_1.Timeframe.FIFTEEN_MINUTES },
    ];
    constructor(demoTradingService, signalsService, telegramNotificationService) {
        this.demoTradingService = demoTradingService;
        this.signalsService = signalsService;
        this.telegramNotificationService = telegramNotificationService;
    }
    async handleDemoTradingCycle() {
        const runAt = new Date();
        if (!this.telegramNotificationService.isEnabled()) {
            this.logger.warn("Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.");
        }
        const checkResult = await this.demoTradingService.checkOpenPositions();
        const closedPositions = checkResult.processed.filter((entry) => entry.status === "WIN" || entry.status === "LOSS");
        for (const position of closedPositions) {
            await this.telegramNotificationService.sendCloseNotification(position);
        }
        this.logger.log(`[demo-scheduler] tick=${runAt.toISOString()} closed=${closedPositions.length}`);
        for (const market of this.demoMarkets) {
            const signal = await this.signalsService.getLiveV2Signal(market.symbol, market.timeframe);
            const action = signal?.action ?? "NO_TRADE";
            if (action !== "BUY" && action !== "SELL") {
                this.logger.log(`[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=false existingClosed=${String(closedPositions.length > 0)}`);
                continue;
            }
            const openResult = await this.demoTradingService.openPosition(market.symbol, market.timeframe);
            const isDuplicateOpen = Boolean(openResult?.position) &&
                openResult?.reason?.includes("Duplicate open demo position");
            const positionOpened = Boolean(openResult?.position) && !isDuplicateOpen;
            if (positionOpened) {
                await this.telegramNotificationService.sendOpenNotification(openResult.position, openResult.action, signal);
            }
            this.logger.log(`[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=${String(positionOpened)} existingClosed=${String(closedPositions.length > 0)}`);
        }
    }
};
exports.DemoTradingScheduler = DemoTradingScheduler;
__decorate([
    (0, schedule_1.Cron)("0 */15 * * * *"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DemoTradingScheduler.prototype, "handleDemoTradingCycle", null);
exports.DemoTradingScheduler = DemoTradingScheduler = DemoTradingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [demo_trading_service_1.DemoTradingService,
        signals_service_1.SignalsService,
        telegram_notification_service_1.TelegramNotificationService])
], DemoTradingScheduler);
//# sourceMappingURL=demo-trading.scheduler.js.map