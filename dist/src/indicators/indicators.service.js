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
        if (period <= 0 || values.length <= period) {
            return null;
        }
        const changes = this.calculatePriceChanges(values);
        let gainSum = 0;
        let lossSum = 0;
        for (let i = 0; i < period; i++) {
            const change = changes[i];
            if (change > 0) {
                gainSum += change;
            }
            else {
                lossSum += Math.abs(change);
            }
        }
        let averageGain = gainSum / period;
        let averageLoss = lossSum / period;
        for (let i = period; i < changes.length; i++) {
            const change = changes[i];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;
            averageGain = (averageGain * (period - 1) + gain) / period;
            averageLoss = (averageLoss * (period - 1) + loss) / period;
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
            return 30;
        }
        if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
            return 30;
        }
        if (priceVsSma === "EQUAL" || priceVsEma === "EQUAL") {
            return 15;
        }
        return 0;
    }
    calculateRsiScore(trend, rsi) {
        if (trend === "NEUTRAL") {
            return 10;
        }
        if (trend === "BULLISH") {
            if (rsi > 50) {
                return 20;
            }
            if (rsi >= 30) {
                return 10;
            }
            return 0;
        }
        if (rsi < 50) {
            return 20;
        }
        if (rsi <= 70) {
            return 10;
        }
        return 0;
    }
    calculateTrueRange(currentHigh, currentLow, previousClose) {
        return Math.max(currentHigh - currentLow, Math.abs(currentHigh - previousClose), Math.abs(currentLow - previousClose));
    }
    calculateAtr(trueRanges, period) {
        if (trueRanges.length < period || period <= 0) {
            return null;
        }
        let atr = 0;
        for (let i = 0; i < period; i++) {
            atr += trueRanges[i];
        }
        atr /= period;
        for (let i = period; i < trueRanges.length; i++) {
            atr = (atr * (period - 1) + trueRanges[i]) / period;
        }
        return atr;
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
    calculateMarketConditionScore(trend, marketCondition) {
        if (trend === "BULLISH" && marketCondition === "BULLISH_CONTINUATION") {
            return 10;
        }
        if (trend === "BEARISH" && marketCondition === "BEARISH_CONTINUATION") {
            return 10;
        }
        return 0;
    }
    calculateDirectionalMovement(currentHigh, currentLow, previousHigh, previousLow) {
        const upwardMove = currentHigh - previousHigh;
        const downwardMove = previousLow - currentLow;
        const plusDm = upwardMove > downwardMove && upwardMove > 0 ? upwardMove : 0;
        const minusDm = downwardMove > upwardMove && downwardMove > 0 ? downwardMove : 0;
        return {
            plusDm,
            minusDm,
        };
    }
    calculateDirectionalMovements(candles) {
        const plusDm = [];
        const minusDm = [];
        for (let i = 1; i < candles.length; i++) {
            const movement = this.calculateDirectionalMovement(candles[i].high, candles[i].low, candles[i - 1].high, candles[i - 1].low);
            plusDm.push(movement.plusDm);
            minusDm.push(movement.minusDm);
        }
        return {
            plusDm,
            minusDm,
        };
    }
    calculateDirectionalIndicators(trueRanges, plusDm, minusDm, period) {
        if (period <= 0 ||
            trueRanges.length < period ||
            plusDm.length < period ||
            minusDm.length < period) {
            return null;
        }
        const recentTrueRanges = trueRanges.slice(-period);
        const recentPlusDm = plusDm.slice(-period);
        const recentMinusDm = minusDm.slice(-period);
        const trAverage = recentTrueRanges.reduce((sum, value) => sum + value, 0) / period;
        if (trAverage === 0) {
            return null;
        }
        const plusDmAverage = recentPlusDm.reduce((sum, value) => sum + value, 0) / period;
        const minusDmAverage = recentMinusDm.reduce((sum, value) => sum + value, 0) / period;
        return {
            plusDi: (plusDmAverage / trAverage) * 100,
            minusDi: (minusDmAverage / trAverage) * 100,
        };
    }
    calculateDirectionalIndex(plusDi, minusDi) {
        const sum = plusDi + minusDi;
        if (sum === 0) {
            return null;
        }
        return (Math.abs(plusDi - minusDi) / sum) * 100;
    }
    calculateAdx(dxValues, period) {
        if (period <= 0 || dxValues.length < period) {
            return null;
        }
        let adx = dxValues.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
        for (let i = period; i < dxValues.length; i++) {
            adx = (adx * (period - 1) + dxValues[i]) / period;
        }
        return adx;
    }
    calculateAdxFromCandles(candles, period) {
        if (period <= 0 || candles.length < period * 2) {
            return null;
        }
        const trueRanges = this.calculateTrueRangesFromCandles(candles);
        const directionalMovements = this.calculateDirectionalMovements(candles);
        if (trueRanges.length < period ||
            directionalMovements.plusDm.length < period ||
            directionalMovements.minusDm.length < period) {
            return null;
        }
        let trSmoothed = 0;
        let plusDmSmoothed = 0;
        let minusDmSmoothed = 0;
        for (let i = 0; i < period; i++) {
            trSmoothed += trueRanges[i];
            plusDmSmoothed += directionalMovements.plusDm[i];
            minusDmSmoothed += directionalMovements.minusDm[i];
        }
        const dxValues = [];
        const calculateDx = () => {
            if (trSmoothed === 0) {
                return null;
            }
            const plusDi = (plusDmSmoothed / trSmoothed) * 100;
            const minusDi = (minusDmSmoothed / trSmoothed) * 100;
            return this.calculateDirectionalIndex(plusDi, minusDi);
        };
        const firstDx = calculateDx();
        if (firstDx !== null) {
            dxValues.push(firstDx);
        }
        for (let i = period; i < trueRanges.length; i++) {
            trSmoothed = trSmoothed - trSmoothed / period + trueRanges[i];
            plusDmSmoothed =
                plusDmSmoothed -
                    plusDmSmoothed / period +
                    directionalMovements.plusDm[i];
            minusDmSmoothed =
                minusDmSmoothed -
                    minusDmSmoothed / period +
                    directionalMovements.minusDm[i];
            const dx = calculateDx();
            if (dx !== null) {
                dxValues.push(dx);
            }
        }
        return this.calculateAdx(dxValues, period);
    }
    calculateAdxScore(adx) {
        if (adx >= 25) {
            return 5;
        }
        return 0;
    }
    calculateIndicatorsFromCandles(candles, period) {
        if (candles.length < period * 2) {
            return null;
        }
        const closes = candles.map((candle) => Number(candle.close));
        const latestPrice = closes[closes.length - 1];
        const sma = this.calculateSma(closes, period);
        const ema = this.calculateEma(closes, period);
        const rsi = this.calculateRsiFromPrices(closes, period);
        const atr = this.calculateAtr(this.calculateTrueRangesFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        }))), period);
        const adx = this.calculateAdxFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        })), period);
        if (sma === null ||
            ema === null ||
            rsi === null ||
            atr === null ||
            adx === null) {
            return null;
        }
        const priceVsSma = this.comparePriceToAverage(latestPrice, sma);
        const priceVsEma = this.comparePriceToAverage(latestPrice, ema);
        const trend = this.determineTrend(priceVsSma, priceVsEma);
        const rsiStatus = this.classifyRsi(rsi);
        const marketCondition = this.determineMarketCondition(trend, rsiStatus);
        return {
            trend,
            priceVsSma,
            priceVsEma,
            rsi,
            rsiStatus,
            marketCondition,
            atr,
            adx,
        };
    }
};
exports.IndicatorsService = IndicatorsService;
exports.IndicatorsService = IndicatorsService = __decorate([
    (0, common_1.Injectable)()
], IndicatorsService);
//# sourceMappingURL=indicators.service.js.map