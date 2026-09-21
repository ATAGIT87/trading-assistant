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
exports.SignalsService = void 0;
const common_1 = require("@nestjs/common");
const indicators_service_1 = require("../indicators/indicators.service");
const market_data_token_1 = require("./market-data.token");
const signal_storage_service_1 = require("./signal-storage.service");
const signal_calculation_service_1 = require("./signal-calculation.service");
const signal_timeframe_service_1 = require("./signal-timeframe.service");
let SignalsService = class SignalsService {
    marketDataService;
    indicatorsService;
    signalStorageService;
    signalCalculationService;
    signalTimeframeService;
    constructor(marketDataService, indicatorsService, signalStorageService, signalCalculationService, signalTimeframeService) {
        this.marketDataService = marketDataService;
        this.indicatorsService = indicatorsService;
        this.signalStorageService = signalStorageService;
        this.signalCalculationService = signalCalculationService;
        this.signalTimeframeService = signalTimeframeService;
    }
    async generateSignal(symbol, timeframe, period) {
        const trend = await this.marketDataService.getTrend(symbol, timeframe, period);
        const higherTimeframeTrend = await this.signalTimeframeService.getHigherTimeframeTrend(symbol, timeframe, period);
        const priceVsSma = await this.marketDataService.compareLatestPriceToSma(symbol, timeframe, period);
        const priceVsEma = await this.marketDataService.compareLatestPriceToEma(symbol, timeframe, period);
        const rsi = await this.marketDataService.getLatestRsi(symbol, timeframe);
        const rsiStatus = await this.marketDataService.getRsiStatus(symbol, timeframe, period);
        const marketCondition = await this.marketDataService.getMarketCondition(symbol, timeframe, period);
        const entryPrice = await this.marketDataService.getLatestPrice(symbol, timeframe);
        const atr = await this.marketDataService.getLatestAtr(symbol, timeframe, period);
        const adx = await this.marketDataService.getLatestAdx(symbol, timeframe, period);
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        if (trend === null ||
            priceVsSma === null ||
            priceVsEma === null ||
            rsi === null ||
            rsiStatus === null ||
            marketCondition === null ||
            entryPrice === null ||
            atr === null ||
            adx === null) {
            return null;
        }
        const signal = this.signalCalculationService.createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition, higherTimeframeTrend, latestCandle.time, false);
        const existingSignal = await this.signalStorageService.getSignalByCandleTime(symbol, timeframe, latestCandle.time);
        if (!existingSignal) {
            await this.signalStorageService.saveSignal(symbol, timeframe, signal);
        }
        return signal;
    }
    async generateSignalFromCandles(symbol, timeframe, candles, higherTimeframeCandles, useHigherTimeframeConfirmation = true, excludeHighAdxSell = false) {
        const indicators = this.indicatorsService.calculateIndicatorsFromCandles(candles, 14);
        if (indicators === null) {
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        const entryPrice = Number(latestCandle.close);
        const higherTimeframeTrend = useHigherTimeframeConfirmation
            ? await this.signalTimeframeService.getHigherTimeframeTrendFromCandles(symbol, timeframe, latestCandle.time, higherTimeframeCandles)
            : null;
        const { trend, priceVsSma, priceVsEma, rsi, rsiStatus, marketCondition, atr, adx, } = indicators;
        return this.signalCalculationService.createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition, higherTimeframeTrend, latestCandle.time, excludeHighAdxSell);
    }
    async getSignalByCandleTime(symbol, timeframe, candleTime) {
        return this.signalStorageService.getSignalByCandleTime(symbol, timeframe, candleTime);
    }
};
exports.SignalsService = SignalsService;
exports.SignalsService = SignalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(market_data_token_1.MARKET_DATA_SERVICE)),
    __metadata("design:paramtypes", [Object, indicators_service_1.IndicatorsService,
        signal_storage_service_1.SignalStorageService,
        signal_calculation_service_1.SignalCalculationService,
        signal_timeframe_service_1.SignalTimeframeService])
], SignalsService);
//# sourceMappingURL=signals.service.js.map