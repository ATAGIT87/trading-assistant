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
const indicators_service_1 = require("../indicators/indicators.service");
const common_1 = require("@nestjs/common");
const market_data_token_1 = require("./market-data.token");
const STRONG_SETUP_THRESHOLD = 75;
let SignalsService = class SignalsService {
    marketDataService;
    indicatorsService;
    constructor(marketDataService, indicatorsService) {
        this.marketDataService = marketDataService;
        this.indicatorsService = indicatorsService;
    }
    determineAction(trend, marketCondition, isStrongSetup, adx, atr) {
        if (!isStrongSetup) {
            return "NO_TRADE";
        }
        if (adx < 25) {
            return "NO_TRADE";
        }
        if (atr <= 0) {
            return "NO_TRADE";
        }
        if ((trend === "BULLISH" && marketCondition === "BEARISH_CONTINUATION") ||
            (trend === "BEARISH" && marketCondition === "BULLISH_CONTINUATION")) {
            return "NO_TRADE";
        }
        if (marketCondition === "BULLISH_CONTINUATION") {
            return "BUY";
        }
        if (marketCondition === "BEARISH_CONTINUATION") {
            return "SELL";
        }
        return "WAIT";
    }
    createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition) {
        const trendScore = this.indicatorsService.calculateTrendScore(trend);
        const averageAlignmentScore = this.indicatorsService.calculateAverageAlignmentScore(priceVsSma, priceVsEma);
        const rsiScore = this.indicatorsService.calculateRsiScore(trend, rsi);
        const marketConditionScore = this.indicatorsService.calculateMarketConditionScore(trend, marketCondition);
        const adxScore = this.indicatorsService.calculateAdxScore(adx);
        const confidence = this.calculateConfidence(trendScore, averageAlignmentScore, rsiScore, marketConditionScore, adxScore);
        const isStrongSetup = confidence >= STRONG_SETUP_THRESHOLD;
        const action = this.determineAction(trend, marketCondition, isStrongSetup, adx, atr);
        let stopLoss = null;
        let takeProfit = null;
        if (action === "BUY" || action === "SELL") {
            stopLoss = this.calculateStopLoss(action, entryPrice, atr);
            takeProfit = this.calculateTakeProfit(action, entryPrice, stopLoss, 2);
        }
        return {
            action,
            confidence,
            entryPrice,
            stopLoss,
            takeProfit,
            isStrongSetup,
            trend,
            rsi,
            adx,
            rsiStatus,
            marketCondition,
            reason: `Trend is ${trend} and RSI status is ${rsiStatus}.`,
        };
    }
    async generateSignal(symbol, timeframe, period) {
        const trend = await this.marketDataService.getTrend(symbol, timeframe, period);
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
        return this.createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition);
    }
    calculateConfidence(trendScore, averageAlignmentScore, rsiScore, marketConditionScore, adxScore) {
        return Math.min(trendScore +
            averageAlignmentScore +
            rsiScore +
            marketConditionScore +
            adxScore, 100);
    }
    calculateStopLoss(action, entryPrice, atr) {
        const stopDistance = 1.5 * atr;
        if (action === "BUY") {
            return entryPrice - stopDistance;
        }
        return entryPrice + stopDistance;
    }
    calculateTakeProfit(action, entryPrice, stopLoss, riskRewardRatio) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = risk * riskRewardRatio;
        if (action === "BUY") {
            return entryPrice + reward;
        }
        return entryPrice - reward;
    }
};
exports.SignalsService = SignalsService;
exports.SignalsService = SignalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(market_data_token_1.MARKET_DATA_SERVICE)),
    __metadata("design:paramtypes", [Object, indicators_service_1.IndicatorsService])
], SignalsService);
//# sourceMappingURL=signals.service.js.map