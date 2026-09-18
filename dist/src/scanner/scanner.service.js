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
const assets_service_1 = require("../assets/assets.service");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
let ScannerService = class ScannerService {
    signalsService;
    marketDataService;
    alertsService;
    assetsService;
    constructor(signalsService, marketDataService, alertsService, assetsService) {
        this.signalsService = signalsService;
        this.marketDataService = marketDataService;
        this.alertsService = alertsService;
        this.assetsService = assetsService;
    }
    isMarketDataFresh(candleTime, timeframe) {
        const timeframeMs = {
            [timeframe_enum_1.Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
            [timeframe_enum_1.Timeframe.ONE_HOUR]: 60 * 60 * 1000,
            [timeframe_enum_1.Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
            [timeframe_enum_1.Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
        };
        const maxAge = timeframeMs[timeframe] * 2;
        const age = Date.now() - candleTime.getTime();
        return age >= 0 && age <= maxAge;
    }
    async scan(symbol, timeframe, period = 14) {
        if (timeframe === timeframe_enum_1.Timeframe.FIFTEEN_MINUTES) {
            await this.marketDataService.syncBinanceCandles(symbol, timeframe_enum_1.Timeframe.ONE_HOUR);
        }
        await this.marketDataService.syncBinanceCandles(symbol, timeframe);
        if (timeframe === timeframe_enum_1.Timeframe.ONE_HOUR) {
            await this.marketDataService.buildFourHourCandles(symbol);
        }
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        if (!this.isMarketDataFresh(latestCandle.time, timeframe)) {
            console.log(`[Scanner] Skipping stale market data: ${symbol} / ${timeframe} / ${latestCandle.time.toISOString()}`);
            return null;
        }
        const existingSignal = await this.signalsService.getSignalByCandleTime(symbol, timeframe, latestCandle.time);
        if (existingSignal) {
            return existingSignal;
        }
        const signal = await this.signalsService.generateSignal(symbol, timeframe, period);
        if (!signal) {
            return null;
        }
        if (signal.action !== "BUY" && signal.action !== "SELL") {
            return signal;
        }
        await this.alertsService.sendSignalAlert(symbol, timeframe, signal);
        return signal;
    }
    async scheduledScan() {
        console.log("[Scanner] Scheduled scan started");
        const assets = await this.assetsService.findActiveAssets();
        console.log(`[Scanner] Active assets: ${assets.length}`);
        for (const asset of assets) {
            const now = new Date();
            if (asset.timeframe === timeframe_enum_1.Timeframe.FIFTEEN_MINUTES &&
                now.getMinutes() % 15 !== 0) {
                continue;
            }
            if (asset.timeframe === timeframe_enum_1.Timeframe.ONE_HOUR && now.getMinutes() !== 0) {
                continue;
            }
            if (asset.timeframe !== timeframe_enum_1.Timeframe.FIFTEEN_MINUTES &&
                asset.timeframe !== timeframe_enum_1.Timeframe.ONE_HOUR) {
                console.log(`[Scanner] Skipping unsupported scheduled timeframe: ${asset.symbol} / ${asset.timeframe}`);
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
        assets_service_1.AssetsService])
], ScannerService);
//# sourceMappingURL=scanner.service.js.map