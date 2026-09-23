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
exports.StrategyV2Service = void 0;
const common_1 = require("@nestjs/common");
const indicators_service_1 = require("../indicators/indicators.service");
let StrategyV2Service = class StrategyV2Service {
    indicatorsService = new indicators_service_1.IndicatorsService();
    constructor() { }
    evaluateCandles(candles, startIndex = 0, endIndex = candles.length, higherTimeframeTrend, higherTimeframeCandleTime, higherTimeframeDurationMs = 0) {
        const safeEnd = Math.min(Math.max(startIndex, endIndex), candles.length);
        if (candles.length === 0 || safeEnd <= startIndex) {
            return this.buildSignal("NO_TRADE", 0, 0, "No candles available for V2 evaluation.", candles);
        }
        const relevantCandles = candles.slice(startIndex, safeEnd);
        if (relevantCandles.length < 3) {
            return this.buildSignal("NO_TRADE", Number(relevantCandles[relevantCandles.length - 1]?.close ?? 0), 0, "Not enough completed candles for V2 evaluation.", relevantCandles);
        }
        const lastIndex = relevantCandles.length - 1;
        const signalTime = relevantCandles[lastIndex].time;
        const regime = this.getRegime(relevantCandles);
        const adx = this.calculateAdx14(relevantCandles);
        const atr14 = this.calculateAtr14(relevantCandles);
        const medianAtr = this.calculateTrailingMedianAtr14(relevantCandles);
        const atrClassification = this.classifyAtrRegime(atr14, medianAtr);
        const rsi = this.calculateRsi(relevantCandles);
        if (higherTimeframeTrend !== undefined && higherTimeframeTrend !== "NEUTRAL") {
            const completedCandle = this.isCompletedHigherTimeframeCandle(higherTimeframeCandleTime, signalTime, higherTimeframeDurationMs);
            if (!completedCandle) {
                return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, "Higher timeframe candle is not complete; V2 requires a completed HTF bar only.", relevantCandles, regime, rsi, adx);
            }
            const matchesHigherTimeframe = (regime === "BULLISH" && higherTimeframeTrend === "BULLISH") ||
                (regime === "BEARISH" && higherTimeframeTrend === "BEARISH");
            if (!matchesHigherTimeframe) {
                return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `Higher timeframe trend ${higherTimeframeTrend} conflicts with V2 regime ${regime}.`, relevantCandles, regime, rsi, adx);
            }
        }
        if (atrClassification === "LOW") {
            return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `ATR14 volatility is low relative to the trailing 50-candle median.`, relevantCandles, regime, rsi, adx);
        }
        if (relevantCandles.length >= 14 && adx < 20) {
            return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `ADX14 is weak at ${adx}, so V2 does not trigger a trade.`, relevantCandles, regime, rsi, adx);
        }
        const breakout = this.findLatestBreakoutEvent(relevantCandles);
        if (!breakout) {
            return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, "No valid V2 breakout on the latest confirmed swing structure.", relevantCandles, regime, rsi, adx);
        }
        const breakoutIsCurrentCandle = breakout.index === lastIndex;
        if (breakoutIsCurrentCandle) {
            return this.buildSignal("WAIT", Number(relevantCandles[lastIndex].close), atr14, `pending breakout: V2 ${breakout.direction.toLowerCase()} setup is awaiting a valid rejection within 3 completed candles.`, relevantCandles, regime, rsi, adx);
        }
        const confirmation = this.findConfirmationEvent(relevantCandles, breakout, atr14, regime, adx, higherTimeframeTrend, higherTimeframeCandleTime, higherTimeframeDurationMs);
        if (confirmation) {
            return {
                ...this.buildSignal(confirmation.direction, confirmation.entryPrice, atr14, confirmation.reason, relevantCandles, regime, rsi, adx, confirmation.candleTime),
                stopLoss: confirmation.stopLoss,
                takeProfit: confirmation.takeProfit,
                confidence: 80,
                isStrongSetup: true,
            };
        }
        const completedCandlesSinceBreakout = lastIndex - breakout.index;
        if (completedCandlesSinceBreakout <= 3) {
            return this.buildSignal("WAIT", Number(relevantCandles[lastIndex].close), atr14, `pending breakout: V2 ${breakout.direction.toLowerCase()} setup is awaiting a valid rejection within 3 completed candles.`, relevantCandles, regime, rsi, adx);
        }
        return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, "V2 breakout expired after 3 completed candles without a valid confirmation.", relevantCandles, regime, rsi, adx);
    }
    isCompletedHigherTimeframeCandle(higherTimeframeCandleTime, signalTime, higherTimeframeDurationMs) {
        if (!higherTimeframeCandleTime || higherTimeframeDurationMs <= 0) {
            return true;
        }
        return higherTimeframeCandleTime.getTime() + higherTimeframeDurationMs < signalTime.getTime();
    }
    getRegime(candles) {
        if (candles.length < 20) {
            return "NEUTRAL";
        }
        const closes = candles.map((candle) => Number(candle.close));
        const ema20 = this.indicatorsService.calculateEma(closes, 20);
        const ema50 = this.indicatorsService.calculateEma(closes, 50);
        const sma20 = this.indicatorsService.calculateSma(closes, 20);
        const sma50 = this.indicatorsService.calculateSma(closes, 50);
        const latestClose = closes[closes.length - 1];
        if (ema20 === null || ema50 === null || sma20 === null || sma50 === null) {
            return "NEUTRAL";
        }
        if (latestClose > ema20 && ema20 > ema50 && sma20 > sma50) {
            return "BULLISH";
        }
        if (latestClose < ema20 && ema20 < ema50 && sma20 < sma50) {
            return "BEARISH";
        }
        return "NEUTRAL";
    }
    calculateAdx14(candles) {
        if (candles.length < 14) {
            return 0;
        }
        return (this.indicatorsService.calculateAdxFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        })), 14) ?? 0);
    }
    calculateAtr14(candles) {
        if (candles.length < 2) {
            return 0;
        }
        const trueRanges = this.indicatorsService.calculateTrueRangesFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        })));
        const atr = this.indicatorsService.calculateAtr(trueRanges, 14);
        if (atr !== null && atr > 0) {
            return atr;
        }
        const ranges = candles.map((candle) => Number(candle.high) - Number(candle.low));
        const avgRange = ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
        return avgRange > 0 ? avgRange : 0.01;
    }
    calculateTrailingMedianAtr14(candles) {
        if (candles.length < 2) {
            return 0;
        }
        const currentWindow = candles.slice(-50);
        const trueRanges = [];
        for (let index = 1; index < currentWindow.length; index++) {
            const previous = currentWindow[index - 1];
            const current = currentWindow[index];
            const tr = this.indicatorsService.calculateTrueRange(Number(current.high), Number(current.low), Number(previous.close));
            trueRanges.push(tr);
        }
        if (trueRanges.length === 0) {
            return 0;
        }
        const atrValues = [];
        for (let index = 13; index < trueRanges.length; index++) {
            const slice = trueRanges.slice(index - 13, index + 1);
            const atr = slice.reduce((sum, value) => sum + value, 0) / slice.length;
            atrValues.push(atr);
        }
        if (atrValues.length === 0) {
            return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
        }
        const sorted = [...atrValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return sorted[mid];
    }
    classifyAtrRegime(atr14, medianAtr) {
        if (medianAtr <= 0) {
            return atr14 <= 0 ? "LOW" : "NORMAL";
        }
        if (atr14 <= 0.75 * medianAtr) {
            return "LOW";
        }
        if (atr14 <= 1.5 * medianAtr) {
            return "NORMAL";
        }
        return "HIGH";
    }
    calculateRsi(candles) {
        const closes = candles.map((candle) => Number(candle.close));
        return this.indicatorsService.calculateRsiFromPrices(closes, 14) ?? 50;
    }
    findLatestBreakoutEvent(candles) {
        let latest = null;
        for (let index = 1; index < candles.length; index++) {
            const priorWindow = candles.slice(Math.max(0, index - 5), index);
            const previousHigh = Math.max(...priorWindow.map((candle) => Number(candle.high)));
            const previousLow = Math.min(...priorWindow.map((candle) => Number(candle.low)));
            const currentClose = Number(candles[index].close);
            if (currentClose > previousHigh) {
                latest = { direction: "BUY", level: previousHigh, close: currentClose, index };
            }
            else if (currentClose < previousLow) {
                latest = { direction: "SELL", level: previousLow, close: currentClose, index };
            }
        }
        return latest;
    }
    findConfirmationEvent(candles, breakout, atr14, regime, adx, higherTimeframeTrend, higherTimeframeCandleTime, higherTimeframeDurationMs = 0) {
        const maxLookahead = 3;
        const lastIndex = candles.length - 1;
        for (let index = breakout.index + 1; index <= lastIndex && index <= breakout.index + maxLookahead; index++) {
            const currentClose = Number(candles[index].close);
            if (breakout.direction === "BUY") {
                const buyMomentum = currentClose < breakout.close && currentClose > breakout.level;
                if (!buyMomentum)
                    continue;
            }
            else {
                const sellMomentum = currentClose > breakout.close && currentClose < breakout.level;
                if (!sellMomentum)
                    continue;
            }
            const expectedRegime = breakout.direction === "BUY" ? "BULLISH" : "BEARISH";
            if (regime !== "NEUTRAL" && regime !== expectedRegime) {
                continue;
            }
            if (higherTimeframeTrend !== undefined && higherTimeframeTrend !== "NEUTRAL") {
                const completedHtf = this.isCompletedHigherTimeframeCandle(higherTimeframeCandleTime, candles[index].time, higherTimeframeDurationMs);
                const matchesHigherTimeframe = (higherTimeframeTrend === "BULLISH" && breakout.direction === "BUY") ||
                    (higherTimeframeTrend === "BEARISH" && breakout.direction === "SELL");
                if (!completedHtf || !matchesHigherTimeframe) {
                    continue;
                }
            }
            if (candles.length >= 14 && adx < 20) {
                continue;
            }
            const stopLoss = this.calculateStructuralStop(candles, index, breakout, atr14);
            const risk = Math.abs(currentClose - stopLoss);
            const target = this.calculateStructuralTarget(currentClose, stopLoss, breakout.direction);
            const reward = Math.abs(target - currentClose);
            if (risk <= 0 || reward / risk < 1 || !Number.isFinite(reward / risk)) {
                continue;
            }
            return {
                direction: breakout.direction,
                entryPrice: currentClose,
                stopLoss,
                takeProfit: target,
                candleTime: candles[index].time,
                reason: breakout.direction === "BUY"
                    ? "V2 BUY confirmed on the actual rejection candle after breakout momentum."
                    : "V2 SELL confirmed on the actual rejection candle after breakout momentum.",
            };
        }
        return null;
    }
    calculateStructuralStop(candles, confirmationIndex, breakout, atr14) {
        const window = candles.slice(Math.max(0, confirmationIndex - 4), confirmationIndex + 1);
        const minLow = Math.min(...window.map((candle) => Number(candle.low)));
        const maxHigh = Math.max(...window.map((candle) => Number(candle.high)));
        const currentClose = Number(candles[confirmationIndex].close);
        if (breakout.direction === "BUY") {
            const structuralStop = Math.min(minLow, breakout.level);
            const atrStop = currentClose - atr14;
            return Math.min(structuralStop, atrStop);
        }
        const structuralStop = Math.max(maxHigh, breakout.level);
        const atrStop = currentClose + atr14;
        return Math.max(structuralStop, atrStop);
    }
    calculateStructuralTarget(entryPrice, stopLoss, direction) {
        const risk = Math.abs(entryPrice - stopLoss);
        if (direction === "BUY") {
            return entryPrice + risk;
        }
        return entryPrice - risk;
    }
    buildSignal(action, entryPrice, atr, reason, candles, trend = "NEUTRAL", rsi = 50, adx = 0, candleTime = candles[candles.length - 1]?.time ?? new Date()) {
        const signalTrend = trend;
        const signalRsiStatus = rsi < 30 ? "OVERSOLD" : rsi > 70 ? "OVERBOUGHT" : "NEUTRAL";
        const signalMarketCondition = signalTrend === "BULLISH"
            ? "BULLISH_CONTINUATION"
            : signalTrend === "BEARISH"
                ? "BEARISH_CONTINUATION"
                : "NEUTRAL";
        let stopLoss = null;
        let takeProfit = null;
        if (action === "BUY" || action === "SELL") {
            const risk = atr * 1.5;
            stopLoss =
                action === "BUY" ? Math.max(0, entryPrice - risk) : entryPrice + risk;
            takeProfit =
                action === "BUY" ? entryPrice + risk * 2 : entryPrice - risk * 2;
        }
        return {
            action,
            confidence: action === "BUY" || action === "SELL" ? 80 : action === "WAIT" ? 55 : 0,
            entryPrice,
            stopLoss,
            takeProfit,
            isStrongSetup: action === "BUY" || action === "SELL",
            trend: signalTrend,
            rsi,
            adx,
            rsiStatus: signalRsiStatus,
            marketCondition: signalMarketCondition,
            candleTime,
            reason,
        };
    }
};
exports.StrategyV2Service = StrategyV2Service;
exports.StrategyV2Service = StrategyV2Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StrategyV2Service);
//# sourceMappingURL=strategy-v2.service.js.map