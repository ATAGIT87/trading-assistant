"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTradeOutcome = findTradeOutcome;
function findTradeOutcome(signal, futureCandles) {
    if (signal.stopLoss === null || signal.takeProfit === null) {
        return {
            result: null,
            exitIndex: null,
            maeR: 0,
            mfeR: 0,
            durationCandles: 0,
        };
    }
    const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);
    if (riskAmount <= 0) {
        return {
            result: null,
            exitIndex: null,
            maeR: 0,
            mfeR: 0,
            durationCandles: 0,
        };
    }
    let maxMae = 0;
    let maxMfe = 0;
    for (let i = 0; i < futureCandles.length; i++) {
        const candle = futureCandles[i];
        const high = Number(candle.high);
        const low = Number(candle.low);
        if (signal.action === "BUY") {
            const adverseMove = (signal.entryPrice - low) / riskAmount;
            const favorableMove = (high - signal.entryPrice) / riskAmount;
            maxMae = Math.max(maxMae, adverseMove);
            maxMfe = Math.max(maxMfe, favorableMove);
            const hitStopLoss = low <= signal.stopLoss;
            const hitTakeProfit = high >= signal.takeProfit;
            if (hitStopLoss && hitTakeProfit) {
                return {
                    result: false,
                    exitIndex: i,
                    maeR: maxMae,
                    mfeR: maxMfe,
                    durationCandles: i + 1,
                };
            }
            if (hitStopLoss) {
                return {
                    result: false,
                    exitIndex: i,
                    maeR: maxMae,
                    mfeR: maxMfe,
                    durationCandles: i + 1,
                };
            }
            if (hitTakeProfit) {
                return {
                    result: true,
                    exitIndex: i,
                    maeR: maxMae,
                    mfeR: maxMfe,
                    durationCandles: i + 1,
                };
            }
        }
        if (signal.action === "SELL") {
            const adverseMove = (high - signal.entryPrice) / riskAmount;
            const favorableMove = (signal.entryPrice - low) / riskAmount;
            maxMae = Math.max(maxMae, adverseMove);
            maxMfe = Math.max(maxMfe, favorableMove);
            const hitStopLoss = high >= signal.stopLoss;
            const hitTakeProfit = low <= signal.takeProfit;
            if (hitStopLoss && hitTakeProfit) {
                return {
                    result: false,
                    exitIndex: i,
                    maeR: maxMae,
                    mfeR: maxMfe,
                    durationCandles: i + 1,
                };
            }
            if (hitStopLoss) {
                return {
                    result: false,
                    exitIndex: i,
                    maeR: maxMae,
                    mfeR: maxMfe,
                    durationCandles: i + 1,
                };
            }
            if (hitTakeProfit) {
                return {
                    result: true,
                    exitIndex: i,
                    maeR: maxMae,
                    mfeR: maxMfe,
                    durationCandles: i + 1,
                };
            }
        }
    }
    return {
        result: null,
        exitIndex: null,
        maeR: maxMae,
        mfeR: maxMfe,
        durationCandles: futureCandles.length,
    };
}
//# sourceMappingURL=backtest-outcome.helper.js.map