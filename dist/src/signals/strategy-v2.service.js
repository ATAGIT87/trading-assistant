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
                return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `HIGHER_TIMEFRAME_CONFLICT: V2 requires a completed HTF candle before evaluation; higher timeframe candle is not complete for signal time ${signalTime.toISOString()}.`, relevantCandles, regime, rsi, adx);
            }
            const matchesHigherTimeframe = (regime === "BULLISH" && higherTimeframeTrend === "BULLISH") ||
                (regime === "BEARISH" && higherTimeframeTrend === "BEARISH");
            if (!matchesHigherTimeframe) {
                return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `HIGHER_TIMEFRAME_CONFLICT: HTF trend ${higherTimeframeTrend} does not match V2 regime ${regime} for the latest completed candle ${signalTime.toISOString()}.`, relevantCandles, regime, rsi, adx);
            }
        }
        if (atrClassification === "LOW") {
            return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `LOW_ATR_VOLATILITY: ATR14 ${atr14} is below the trailing median ATR threshold, so V2 blocks the setup at ${signalTime.toISOString()}.`, relevantCandles, regime, rsi, adx);
        }
        if (relevantCandles.length >= 14 && adx < 15) {
            return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `ADX_WEAK: ADX14 is ${adx} below the V2 minimum of 15 at the latest completed candle ${signalTime.toISOString()}.`, relevantCandles, regime, rsi, adx);
        }
        const breakout = this.findLatestBreakoutEvent(relevantCandles);
        if (!breakout) {
            const swingInfo = this.describeNoConfirmedSwingBreakout(relevantCandles, lastIndex);
            return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `NO_CONFIRMED_SWING_BREAKOUT: ${swingInfo}`, relevantCandles, regime, rsi, adx);
        }
        const breakoutIsCurrentCandle = breakout.index === lastIndex;
        if (breakoutIsCurrentCandle) {
            return this.buildSignal("WAIT", Number(relevantCandles[lastIndex].close), atr14, `BREAKOUT_CANDLE_WAIT: V2 ${breakout.direction} breakout occurred at candle index ${breakout.index}, but the breakout candle itself is the latest completed candle; confirmation is still pending within the 3-candle window.`, relevantCandles, regime, rsi, adx);
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
            return this.buildSignal("WAIT", Number(relevantCandles[lastIndex].close), atr14, `BREAKOUT_CONFIRMATION_PENDING: V2 ${breakout.direction} breakout at index ${breakout.index} still has not produced a valid rejection within the 3-candle confirmation window; latest completed candle is ${signalTime.toISOString()}.`, relevantCandles, regime, rsi, adx);
        }
        return this.buildSignal("NO_TRADE", Number(relevantCandles[lastIndex].close), atr14, `BREAKOUT_EXPIRED: V2 ${breakout.direction} breakout at index ${breakout.index} expired after 3 completed candles without a valid confirmation; latest completed candle ${signalTime.toISOString()} closed at ${Number(relevantCandles[lastIndex].close)}.`, relevantCandles, regime, rsi, adx);
    }
    describeNoConfirmedSwingBreakout(candles, lastIndex) {
        const latestCandle = candles[lastIndex];
        const latestTime = latestCandle?.time ?? new Date();
        const latestClose = Number(latestCandle?.close ?? 0);
        const latestConfirmedHigh = (() => {
            for (let index = candles.length - 1; index >= 4; index--) {
                const currentHigh = Number(candles[index].high);
                const priorHighs = candles.slice(Math.max(0, index - 4), index).map((candle) => Number(candle.high));
                if (currentHigh >= Math.max(...priorHighs)) {
                    return { level: currentHigh, index };
                }
            }
            return null;
        })();
        const latestConfirmedLow = (() => {
            for (let index = candles.length - 1; index >= 4; index--) {
                const currentLow = Number(candles[index].low);
                const priorLows = candles.slice(Math.max(0, index - 4), index).map((candle) => Number(candle.low));
                if (currentLow <= Math.min(...priorLows)) {
                    return { level: currentLow, index };
                }
            }
            return null;
        })();
        const latestBreakout = (() => {
            const breakout = this.findLatestBreakoutEvent(candles);
            if (!breakout) {
                return null;
            }
            return { direction: breakout.direction, index: breakout.index, level: breakout.level };
        })();
        const swingHighText = latestConfirmedHigh
            ? `confirmed swing high exists at index ${latestConfirmedHigh.index} with level ${latestConfirmedHigh.level}`
            : "confirmed swing high does not exist";
        const swingLowText = latestConfirmedLow
            ? `confirmed swing low exists at index ${latestConfirmedLow.index} with level ${latestConfirmedLow.level}`
            : "confirmed swing low does not exist";
        const latestBreakoutText = latestBreakout
            ? `latest breakout ${latestBreakout.direction} at index ${latestBreakout.index} with level ${latestBreakout.level}`
            : "latest breakout unavailable";
        return `latest completed candle time=${latestTime.toISOString()}, latest close=${latestClose}, ${swingHighText}, ${swingLowText}, ${latestBreakoutText}.`;
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
        let confirmedSwingHigh = null;
        let confirmedSwingLow = null;
        let candidateSwingHigh = null;
        let candidateSwingLow = null;
        for (let index = 4; index < candles.length; index++) {
            const current = candles[index];
            const currentClose = Number(current.close);
            const currentHigh = Number(current.high);
            const currentLow = Number(current.low);
            if (confirmedSwingHigh !== null) {
                const breakoutBuy = currentClose > confirmedSwingHigh.level && currentHigh > confirmedSwingHigh.level;
                if (breakoutBuy) {
                    latest = {
                        direction: "BUY",
                        level: confirmedSwingHigh.level,
                        close: currentClose,
                        index,
                    };
                }
            }
            if (confirmedSwingLow !== null) {
                const breakoutSell = currentClose < confirmedSwingLow.level && currentLow < confirmedSwingLow.level;
                if (breakoutSell) {
                    latest = {
                        direction: "SELL",
                        level: confirmedSwingLow.level,
                        close: currentClose,
                        index,
                    };
                }
            }
            if (confirmedSwingHigh !== null && currentClose > confirmedSwingHigh.level) {
                confirmedSwingHigh = null;
            }
            if (confirmedSwingLow !== null && currentClose < confirmedSwingLow.level) {
                confirmedSwingLow = null;
            }
            const priorWindowHighs = candles
                .slice(Math.max(0, index - 4), index)
                .map((candle) => Number(candle.high));
            const priorWindowLows = candles
                .slice(Math.max(0, index - 4), index)
                .map((candle) => Number(candle.low));
            const isSwingHighCandidate = currentHigh >= Math.max(...priorWindowHighs);
            const isSwingLowCandidate = currentLow <= Math.min(...priorWindowLows);
            if (isSwingHighCandidate) {
                const candidate = { level: currentHigh, index };
                if (candidateSwingHigh === null ||
                    candidate.level > candidateSwingHigh.level ||
                    (candidate.level === candidateSwingHigh.level && candidate.index > candidateSwingHigh.index)) {
                    candidateSwingHigh = candidate;
                }
            }
            else if (candidateSwingHigh !== null && currentClose <= candidateSwingHigh.level) {
                if (confirmedSwingHigh === null ||
                    candidateSwingHigh.level > confirmedSwingHigh.level ||
                    (candidateSwingHigh.level === confirmedSwingHigh.level &&
                        candidateSwingHigh.index > confirmedSwingHigh.index)) {
                    confirmedSwingHigh = candidateSwingHigh;
                }
                candidateSwingHigh = null;
            }
            else if (candidateSwingHigh !== null && currentClose > candidateSwingHigh.level) {
                candidateSwingHigh = null;
            }
            if (isSwingLowCandidate) {
                const candidate = { level: currentLow, index };
                if (candidateSwingLow === null ||
                    candidate.level < candidateSwingLow.level ||
                    (candidate.level === candidateSwingLow.level && candidate.index > candidateSwingLow.index)) {
                    candidateSwingLow = candidate;
                }
            }
            else if (candidateSwingLow !== null && currentClose >= candidateSwingLow.level) {
                if (confirmedSwingLow === null ||
                    candidateSwingLow.level < confirmedSwingLow.level ||
                    (candidateSwingLow.level === confirmedSwingLow.level &&
                        candidateSwingLow.index > confirmedSwingLow.index)) {
                    confirmedSwingLow = candidateSwingLow;
                }
                candidateSwingLow = null;
            }
            else if (candidateSwingLow !== null && currentClose < candidateSwingLow.level) {
                candidateSwingLow = null;
            }
        }
        if (latest && candles.length - 1 - latest.index > 3) {
            return null;
        }
        return latest;
    }
    findConfirmationEvent(candles, breakout, atr14, regime, adx, higherTimeframeTrend, higherTimeframeCandleTime, higherTimeframeDurationMs = 0) {
        const maxLookahead = 3;
        const lastIndex = candles.length - 1;
        const startIndex = breakout.index + 1;
        const maxIndex = Math.min(lastIndex, breakout.index + maxLookahead);
        for (let index = startIndex; index <= maxIndex; index++) {
            const confirmCandles = candles.slice(0, index + 1);
            const currentClose = Number(candles[index].close);
            const currentOpen = Number(candles[index].open);
            const currentHigh = Number(candles[index].high);
            const currentLow = Number(candles[index].low);
            if (index < 3) {
                continue;
            }
            const priorThreeCloses = candles.slice(index - 3, index).map((candle) => Number(candle.close));
            const priorThreeHighs = candles.slice(index - 3, index).map((candle) => Number(candle.high));
            const priorThreeLows = candles.slice(index - 3, index).map((candle) => Number(candle.low));
            const momentum = currentClose - Number(candles[index - 3].close);
            if (breakout.direction === "BUY") {
                const retestLevel = currentLow <= breakout.level;
                const closesAboveBreakout = currentClose > breakout.level;
                const bullishRejection = currentClose > currentOpen;
                const momentumCheck = momentum > 0 && currentClose > Math.max(...priorThreeHighs);
                if (!(retestLevel && closesAboveBreakout && bullishRejection && momentumCheck)) {
                    continue;
                }
            }
            else {
                const retestLevel = currentHigh >= breakout.level;
                const closesBelowBreakout = currentClose < breakout.level;
                const bearishRejection = currentClose < currentOpen;
                const momentumCheck = momentum < 0 && currentClose < Math.min(...priorThreeLows);
                if (!(retestLevel && closesBelowBreakout && bearishRejection && momentumCheck)) {
                    continue;
                }
            }
            const actualRegime = this.getRegime(confirmCandles);
            const actualAdx = this.calculateAdx14(confirmCandles);
            const effectiveRegime = actualRegime === "NEUTRAL" ? regime : actualRegime;
            const effectiveAdx = actualAdx > 0 ? actualAdx : adx;
            const expectedRegime = breakout.direction === "BUY" ? "BULLISH" : "BEARISH";
            if (effectiveRegime !== "NEUTRAL" && effectiveRegime !== expectedRegime) {
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
            if (confirmCandles.length >= 14 && effectiveAdx < 20) {
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