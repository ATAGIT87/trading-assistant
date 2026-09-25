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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const signals_service_1 = require("../signals/signals.service");
const market_data_service_1 = require("../market-data/market-data.service");
const alerts_service_1 = require("../alerts/alerts.service");
const backtesting_service_1 = require("../backtesting/backtesting.service");
const assets_service_1 = require("../assets/assets.service");
const timeframe_utils_1 = require("../assets/timeframe.utils");
let ScannerService = class ScannerService {
    signalsService;
    marketDataService;
    alertsService;
    assetsService;
    backtestingService;
    constructor(signalsService, marketDataService, alertsService, assetsService, backtestingService) {
        this.signalsService = signalsService;
        this.marketDataService = marketDataService;
        this.alertsService = alertsService;
        this.assetsService = assetsService;
        this.backtestingService = backtestingService;
    }
    isMarketDataFresh(candleTime, timeframe) {
        const maxAge = timeframe_utils_1.timeframeDurationMs[timeframe] * 2;
        const age = Date.now() - candleTime.getTime();
        return age >= 0 && age <= maxAge;
    }
    async scan(symbol, timeframe) {
        await this.marketDataService.syncBinanceCandles(symbol, timeframe);
        const higherTimeframe = (0, timeframe_utils_1.getHigherTimeframe)(timeframe);
        if (higherTimeframe !== null) {
            await this.marketDataService.syncBinanceCandles(symbol, higherTimeframe);
        }
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            console.log(`[Scanner] ${symbol} / ${timeframe} → NO_CANDLES`);
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        console.log(`[Scanner] Latest candle: ${symbol} / ${timeframe} → ${latestCandle.time.toISOString()} | close: ${latestCandle.close}`);
        if (!this.isMarketDataFresh(latestCandle.time, timeframe)) {
            console.log(`[Scanner] Skipping stale market data: ${symbol} / ${timeframe} / ${latestCandle.time.toISOString()}`);
            return null;
        }
        const signal = await this.signalsService.getLiveV2Signal(symbol, timeframe);
        if (!signal) {
            console.log(`[Scanner] ${symbol} / ${timeframe} → NO_SIGNAL (V2: no completed candles available or no valid setup)`);
            return null;
        }
        if (signal.action === "BUY" || signal.action === "SELL") {
            const readiness = await this.backtestingService.getReadiness(symbol, timeframe);
            if (readiness.isReady) {
                await this.alertsService.sendSignalAlert(symbol, timeframe, signal);
            }
            else {
                console.warn(`[Scanner] Alert blocked for ${symbol} / ${timeframe}: ${readiness.reason}`);
            }
        }
        console.log(`[Scanner] ${symbol} / ${timeframe} → ${signal.action} (signalTime: ${signal.candleTime.toISOString()}, reason: ${signal.reason})`);
        return signal;
    }
    async scheduledScan() {
        console.log("[Scanner] Scheduled scan started");
        const assets = await this.assetsService.findActiveAssets();
        console.log(`[Scanner] Active assets: ${assets.length}`);
        for (const asset of assets) {
            const now = new Date();
            if (!(0, timeframe_utils_1.isTimeframeBoundary)(asset.timeframe, now)) {
                continue;
            }
            console.log(`[Scanner] Scanning ${asset.symbol} / ${asset.timeframe}`);
            try {
                await this.scan(asset.symbol, asset.timeframe);
            }
            catch (error) {
                console.error(`[Scanner] Failed ${asset.symbol} / ${asset.timeframe}`, error);
            }
        }
        console.log("[Scanner] Scheduled scan finished");
    }
};
exports.ScannerService = ScannerService;
__decorate([
    (0, schedule_1.Cron)("*/15 * * * *"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScannerService.prototype, "scheduledScan", null);
exports.ScannerService = ScannerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [signals_service_1.SignalsService,
        market_data_service_1.MarketDataService,
        alerts_service_1.AlertsService,
        assets_service_1.AssetsService,
        backtesting_service_1.BacktestingService])
], ScannerService);
//# sourceMappingURL=scanner.service.js.map