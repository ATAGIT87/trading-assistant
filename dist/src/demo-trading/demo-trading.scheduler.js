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
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const spot_trading_policy_1 = require("../trading/spot-trading-policy");
const timeframe_utils_1 = require("../assets/timeframe.utils");
const market_data_service_1 = require("../market-data/market-data.service");
const signals_service_1 = require("../signals/signals.service");
const backtesting_service_1 = require("../backtesting/backtesting.service");
const demo_trading_service_1 = require("./demo-trading.service");
const telegram_notification_service_1 = require("./telegram-notification.service");
const assets_service_1 = require("../assets/assets.service");
let DemoTradingScheduler = DemoTradingScheduler_1 = class DemoTradingScheduler {
    demoTradingService;
    signalsService;
    marketDataService;
    backtestingService;
    telegramNotificationService;
    assetsService;
    configService;
    logger = new common_1.Logger(DemoTradingScheduler_1.name);
    constructor(demoTradingService, signalsService, marketDataService, backtestingService, telegramNotificationService, assetsService, configService) {
        this.demoTradingService = demoTradingService;
        this.signalsService = signalsService;
        this.marketDataService = marketDataService;
        this.backtestingService = backtestingService;
        this.telegramNotificationService = telegramNotificationService;
        this.assetsService = assetsService;
        this.configService = configService;
    }
    async handleDemoTradingCycle() {
        const runAt = new Date();
        const approvedDemo = this.configService.get("DEMO_TRADING_ENABLED", "false") === "true";
        const exploratoryDemo = this.isExploratoryDemoDue(runAt);
        if (!approvedDemo && !exploratoryDemo) {
            this.logger.log("[demo-scheduler] Demo trading is disabled; exploratory Demo is not enabled.");
            return;
        }
        if (!this.telegramNotificationService.isEnabled()) {
            this.logger.warn("Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID.");
        }
        const demoMarkets = await this.assetsService.findActiveAssets();
        if (demoMarkets.length === 0) {
            this.logger.warn("[demo-scheduler] no active assets configured; Demo cycle skipped.");
            return;
        }
        for (const market of demoMarkets) {
            await this.marketDataService.syncSpotCandles(market.symbol, market.timeframe);
            const higherTimeframe = (0, timeframe_utils_1.getHigherTimeframe)(market.timeframe);
            if (higherTimeframe !== null) {
                await this.marketDataService.syncSpotCandles(market.symbol, higherTimeframe);
            }
        }
        const checkResult = await this.demoTradingService.checkOpenPositions();
        const closedPositions = checkResult.processed.filter((entry) => entry.status === "WIN" || entry.status === "LOSS");
        for (const position of closedPositions) {
            await this.telegramNotificationService.sendCloseNotification(position);
        }
        this.logger.log(`[demo-scheduler] tick=${runAt.toISOString()} closed=${closedPositions.length}`);
        for (const market of demoMarkets) {
            if (!(0, timeframe_utils_1.isTimeframeBoundary)(market.timeframe, runAt)) {
                continue;
            }
            if (approvedDemo) {
                const readiness = await this.backtestingService.getReadiness(market.symbol, market.timeframe);
                if (!readiness.isReady) {
                    this.logger.warn(`[demo-scheduler] ${market.symbol} / ${market.timeframe} skipped: ${readiness.reason}`);
                    continue;
                }
            }
            const signal = await this.signalsService.getLiveV2Signal(market.symbol, market.timeframe);
            const action = signal?.action ?? "NO_TRADE";
            if (!(0, spot_trading_policy_1.isAllowedSpotEntry)(action)) {
                this.logger.log(`[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=false existingClosed=${String(closedPositions.length > 0)}`);
                continue;
            }
            const openResult = await this.demoTradingService.openPosition(market.symbol, market.timeframe, !approvedDemo && exploratoryDemo);
            const isDuplicateOpen = Boolean(openResult?.position) &&
                openResult?.reason?.includes("Duplicate open demo position");
            const positionOpened = Boolean(openResult?.position) && !isDuplicateOpen;
            if (positionOpened) {
                await this.telegramNotificationService.sendOpenNotification(openResult.position, openResult.action, signal);
            }
            this.logger.log(`[demo-scheduler] timestamp=${runAt.toISOString()} symbol=${market.symbol} timeframe=${market.timeframe} action=${action} positionOpened=${String(positionOpened)} existingClosed=${String(closedPositions.length > 0)}`);
        }
    }
    isExploratoryDemoDue(now) {
        if (this.configService.get("EXPLORATORY_DEMO_ENABLED", "false") !== "true") {
            return false;
        }
        const start = new Date(this.configService.get("EXPLORATORY_DEMO_START_AT", ""));
        return Number.isFinite(start.getTime()) && now.getTime() >= start.getTime();
    }
};
exports.DemoTradingScheduler = DemoTradingScheduler;
__decorate([
    (0, schedule_1.Cron)("10 */15 * * * *"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DemoTradingScheduler.prototype, "handleDemoTradingCycle", null);
exports.DemoTradingScheduler = DemoTradingScheduler = DemoTradingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [demo_trading_service_1.DemoTradingService,
        signals_service_1.SignalsService,
        market_data_service_1.MarketDataService,
        backtesting_service_1.BacktestingService,
        telegram_notification_service_1.TelegramNotificationService,
        assets_service_1.AssetsService,
        config_1.ConfigService])
], DemoTradingScheduler);
//# sourceMappingURL=demo-trading.scheduler.js.map