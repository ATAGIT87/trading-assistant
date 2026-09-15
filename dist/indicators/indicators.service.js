"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorsService = void 0;
const common_1 = require("@nestjs/common");
let IndicatorsService = class IndicatorsService {
    calculateSma(values, period) {
        if (values.length < period) {
            return null;
        }
        const recentValues = values.slice(-period);
        const sum = recentValues.reduce((total, value) => total + value, 0);
        return sum / period;
    }
    calculateSmaFromCandles(candles, period) {
        const closes = candles.map((candle) => Number(candle.close));
        return this.calculateSma(closes, period);
    }
    calculateEma(values, period) {
        if (values.length < period) {
            return null;
        }
        const initialValues = values.slice(0, period);
        let ema = initialValues.reduce((sum, value) => sum + value, 0) / period;
        const multiplier = 2 / (period + 1);
        for (let i = period; i < values.length; i++) {
            ema = (values[i] - ema) * multiplier + ema;
        }
        return ema;
    }
    calculatePriceChanges(values) {
        const changes = [];
        for (let i = 1; i < values.length; i++) {
            changes.push(values[i] - values[i - 1]);
        }
        return changes;
    }
    calculateGainsAndLosses(changes) {
        const gains = [];
        const losses = [];
        for (const change of changes) {
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        return {
            gains,
            losses,
        };
    }
    calculateAverage(values, period) {
        if (values.length < period) {
            return null;
        }
        const recentValues = values.slice(-period);
        const sum = recentValues.reduce((total, value) => total + value, 0);
        return sum / period;
    }
    calculateRsi(averageGain, averageLoss) {
        if (averageLoss === 0) {
            return 100;
        }
        const rs = averageGain / averageLoss;
        return 100 - 100 / (1 + rs);
    }
    calculateRsiFromPrices(values, period) {
        if (values.length <= period) {
            return null;
        }
        const changes = this.calculatePriceChanges(values);
        const { gains, losses } = this.calculateGainsAndLosses(changes);
        const averageGain = this.calculateAverage(gains, period);
        const averageLoss = this.calculateAverage(losses, period);
        if (averageGain === null || averageLoss === null) {
            return null;
        }
        return this.calculateRsi(averageGain, averageLoss);
    }
    calculateRsiFromCandles(candles, period) {
        const closes = candles.map((candle) => Number(candle.close));
        return this.calculateRsiFromPrices(closes, period);
    }
    comparePriceToAverage(price, average) {
        if (price > average) {
            return "ABOVE";
        }
        if (price < average) {
            return "BELOW";
        }
        return "EQUAL";
    }
    compareSmaToEma(sma, ema) {
        if (sma > ema) {
            return "SMA_ABOVE_EMA";
        }
        if (sma < ema) {
            return "SMA_BELOW_EMA";
        }
        return "SMA_EQUAL_EMA";
    }
    determineTrend(priceVsSma, priceVsEma) {
        if (priceVsSma === "ABOVE" && priceVsEma === "ABOVE") {
            return "BULLISH";
        }
        if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
            return "BEARISH";
        }
        return "NEUTRAL";
    }
    classifyRsi(rsi) {
        if (rsi < 30) {
            return "OVERSOLD";
        }
        if (rsi > 70) {
            return "OVERBOUGHT";
        }
        return "NEUTRAL";
    }
    determineMarketCondition(trend, rsiStatus) {
        if (trend === "BEARISH" && rsiStatus === "OVERSOLD") {
            return "POSSIBLE_REVERSAL";
        }
        if (trend === "BEARISH" && rsiStatus === "NEUTRAL") {
            return "BEARISH_CONTINUATION";
        }
        if (trend === "BULLISH" && rsiStatus === "OVERBOUGHT") {
            return "POSSIBLE_REVERSAL";
        }
        if (trend === "BULLISH" && rsiStatus === "NEUTRAL") {
            return "BULLISH_CONTINUATION";
        }
        return "NEUTRAL";
    }
    calculateTrendScore(trend) {
        if (trend === "BULLISH" || trend === "BEARISH") {
            return 40;
        }
        return 0;
    }
    calculateAverageAlignmentScore(priceVsSma, priceVsEma) {
        if (priceVsSma === "ABOVE" && priceVsEma === "ABOVE") {
            return 40;
        }
        if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
            return 40;
        }
        if (priceVsSma === "EQUAL" || priceVsEma === "EQUAL") {
            return 20;
        }
        return 0;
    }
    calculateRsiScore(rsiStatus) {
        if (rsiStatus === "NEUTRAL") {
            return 20;
        }
        return 10;
    }
    calculateTrueRange(currentHigh, currentLow, previousClose) {
        return Math.max(currentHigh - currentLow, Math.abs(currentHigh - previousClose), Math.abs(currentLow - previousClose));
    }
    calculateAtr(trueRanges, period) {
        if (trueRanges.length < period || period <= 0) {
            return null;
        }
        const recentTrueRanges = trueRanges.slice(-period);
        const sum = recentTrueRanges.reduce((total, trueRange) => total + trueRange, 0);
        return sum / period;
    }
    calculateTrueRangesFromCandles(candles) {
        const trueRanges = [];
        for (let i = 1; i < candles.length; i++) {
            const currentCandle = candles[i];
            const previousCandle = candles[i - 1];
            const trueRange = this.calculateTrueRange(currentCandle.high, currentCandle.low, previousCandle.close);
            trueRanges.push(trueRange);
        }
        return trueRanges;
    }
};
exports.IndicatorsService = IndicatorsService;
exports.IndicatorsService = IndicatorsService = __decorate([
    (0, common_1.Injectable)()
], IndicatorsService);
//# sourceMappingURL=indicators.service.js.map