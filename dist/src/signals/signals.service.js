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
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const indicators_service_1 = require("../indicators/indicators.service");
const market_data_token_1 = require("./market-data.token");
const signal_storage_service_1 = require("./signal-storage.service");
const signal_calculation_service_1 = require("./signal-calculation.service");
const signal_timeframe_service_1 = require("./signal-timeframe.service");
const strategy_v2_service_1 = require("./strategy-v2.service");
let SignalsService = class SignalsService {
    marketDataService;
    indicatorsService;
    signalStorageService;
    signalCalculationService;
    signalTimeframeService;
    strategyV2Service;
    constructor(marketDataService, indicatorsService, signalStorageService, signalCalculationService, signalTimeframeService, strategyV2Service) {
        this.marketDataService = marketDataService;
        this.indicatorsService = indicatorsService;
        this.signalStorageService = signalStorageService;
        this.signalCalculationService = signalCalculationService;
        this.signalTimeframeService = signalTimeframeService;
        this.strategyV2Service = strategyV2Service;
    }
    async generateSignal(symbol, timeframe, period) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        const trend = await this.marketDataService.getTrend(symbol, timeframe, period);
        const higherTimeframeTrend = await this.signalTimeframeService.getHigherTimeframeTrend(symbol, timeframe, period, latestCandle.time);
        const priceVsSma = await this.marketDataService.compareLatestPriceToSma(symbol, timeframe, period);
        const priceVsEma = await this.marketDataService.compareLatestPriceToEma(symbol, timeframe, period);
        const rsi = await this.marketDataService.getLatestRsi(symbol, timeframe);
        const rsiStatus = await this.marketDataService.getRsiStatus(symbol, timeframe, period);
        const marketCondition = await this.marketDataService.getMarketCondition(symbol, timeframe, period);
        const entryPrice = await this.marketDataService.getLatestPrice(symbol, timeframe);
        const atr = await this.marketDataService.getLatestAtr(symbol, timeframe, period);
        const adx = await this.marketDataService.getLatestAdx(symbol, timeframe, period);
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
    async generateSignalV2(symbol, timeframe, period, higherTimeframeTrend) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        const signal = this.strategyV2Service.evaluateCandles(candles, 0, candles.length, higherTimeframeTrend);
        if (signal.action === "WAIT" ||
            signal.action === "BUY" ||
            signal.action === "SELL") {
            return signal;
        }
        return signal;
    }
    getCompletedCandles(candles, timeframe, now = new Date()) {
        const durationMs = timeframe === timeframe_enum_1.Timeframe.FIFTEEN_MINUTES
            ? 15 * 60 * 1000
            : timeframe === timeframe_enum_1.Timeframe.ONE_HOUR
                ? 60 * 60 * 1000
                : timeframe === timeframe_enum_1.Timeframe.FOUR_HOURS
                    ? 4 * 60 * 60 * 1000
                    : timeframe === timeframe_enum_1.Timeframe.ONE_DAY
                        ? 24 * 60 * 60 * 1000
                        : 0;
        return candles.filter((candle) => candle.time.getTime() + durationMs < now.getTime());
    }
    calculateRiskReward(entryPrice, stopLoss, takeProfit) {
        if (stopLoss === null || takeProfit === null) {
            return null;
        }
        const risk = Math.abs(entryPrice - stopLoss);
        if (risk <= 0) {
            return null;
        }
        return Math.abs(takeProfit - entryPrice) / risk;
    }
    async getLiveV2Signal(symbol, timeframe) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const completedCandles = this.getCompletedCandles(candles, timeframe);
        if (completedCandles.length === 0) {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                signalTime: new Date(),
                entry: null,
                stopLoss: null,
                takeProfit: null,
                riskReward: null,
                reason: "No completed candles are available at request time.",
                strategyVersion: "V2",
            };
        }
        const signal = this.strategyV2Service.evaluateCandles(completedCandles, 0, completedCandles.length);
        const isTradeSignal = signal.action === "BUY" || signal.action === "SELL";
        return {
            symbol,
            timeframe,
            action: signal.action,
            signalTime: signal.candleTime,
            entry: isTradeSignal ? signal.entryPrice : null,
            stopLoss: isTradeSignal ? signal.stopLoss : null,
            takeProfit: isTradeSignal ? signal.takeProfit : null,
            riskReward: isTradeSignal
                ? this.calculateRiskReward(signal.entryPrice, signal.stopLoss, signal.takeProfit)
                : null,
            reason: signal.reason,
            strategyVersion: "V2",
        };
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
        signal_timeframe_service_1.SignalTimeframeService,
        strategy_v2_service_1.StrategyV2Service])
], SignalsService);
//# sourceMappingURL=signals.service.js.map