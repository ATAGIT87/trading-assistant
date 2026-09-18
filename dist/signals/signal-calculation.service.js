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
exports.SignalCalculationService = void 0;
const common_1 = require("@nestjs/common");
const indicators_service_1 = require("../indicators/indicators.service");
const STRONG_SETUP_THRESHOLD = 75;
let SignalCalculationService = class SignalCalculationService {
    indicatorsService;
    constructor(indicatorsService) {
        this.indicatorsService = indicatorsService;
    }
    createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition, higherTimeframeTrend, candleTime) {
        const trendScore = this.indicatorsService.calculateTrendScore(trend);
        const averageAlignmentScore = this.indicatorsService.calculateAverageAlignmentScore(priceVsSma, priceVsEma);
        const rsiScore = this.indicatorsService.calculateRsiScore(trend, rsi);
        const marketConditionScore = this.indicatorsService.calculateMarketConditionScore(trend, marketCondition);
        const adxScore = this.indicatorsService.calculateAdxScore(adx);
        const confidence = this.calculateConfidence(trendScore, averageAlignmentScore, rsiScore, marketConditionScore, adxScore);
        const isStrongSetup = confidence >= STRONG_SETUP_THRESHOLD;
        const action = this.determineAction(higherTimeframeTrend, trend, marketCondition, isStrongSetup, adx, atr);
        let stopLoss = null;
        let takeProfit = null;
        if (action === "BUY" || action === "SELL") {
            stopLoss =
                this.calculateStopLoss(action, entryPrice, atr);
            takeProfit =
                this.calculateTakeProfit(action, entryPrice, stopLoss, 2);
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
            candleTime,
            reason: action === "BUY"
                ? `Bullish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
                : action === "SELL"
                    ? `Bearish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
                    : `No valid trading setup. Trend: ${trend}, Higher timeframe trend: ${higherTimeframeTrend ?? "N/A"}, RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`,
        };
    }
    determineAction(higherTimeframeTrend, trend, marketCondition, isStrongSetup, adx, atr) {
        if (!isStrongSetup) {
            return "NO_TRADE";
        }
        if (trend === "NEUTRAL") {
            return "NO_TRADE";
        }
        if (adx < 25) {
            return "NO_TRADE";
        }
        if (atr <= 0) {
            return "NO_TRADE";
        }
        if (higherTimeframeTrend !== null &&
            ((trend === "BULLISH" &&
                higherTimeframeTrend !== "BULLISH") ||
                (trend === "BEARISH" &&
                    higherTimeframeTrend !== "BEARISH"))) {
            return "NO_TRADE";
        }
        if ((trend === "BULLISH" &&
            marketCondition === "BEARISH_CONTINUATION") ||
            (trend === "BEARISH" &&
                marketCondition === "BULLISH_CONTINUATION")) {
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
exports.SignalCalculationService = SignalCalculationService;
exports.SignalCalculationService = SignalCalculationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [indicators_service_1.IndicatorsService])
], SignalCalculationService);
//# sourceMappingURL=signal-calculation.service.js.map