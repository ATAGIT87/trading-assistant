"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBacktestStatistics = calculateBacktestStatistics;
function average(values) {
    return values.length === 0
        ? 0
        : values.reduce((sum, value) => sum + value, 0) / values.length;
}
function calculateBacktestStatistics(trades) {
    const entries = trades.filter((trade) => trade.action === "BUY");
    const wins = entries.filter((trade) => trade.result === "WIN");
    const losses = entries.filter((trade) => trade.result === "LOSS");
    return {
        entryTrades: entries.length,
        entryWins: wins.length,
        entryLosses: losses.length,
        entryTotalR: entries.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0),
        winAverageRsi: average(wins.map((trade) => trade.rsi)),
        lossAverageRsi: average(losses.map((trade) => trade.rsi)),
        winAverageAdx: average(wins.map((trade) => trade.adx)),
        lossAverageAdx: average(losses.map((trade) => trade.adx)),
        winAverageMaeR: average(wins.map((trade) => trade.maeR)),
        winAverageMfeR: average(wins.map((trade) => trade.mfeR)),
        winAverageDurationCandles: average(wins.map((trade) => trade.durationCandles)),
        lossAverageMaeR: average(losses.map((trade) => trade.maeR)),
        lossAverageMfeR: average(losses.map((trade) => trade.mfeR)),
        lossAverageDurationCandles: average(losses.map((trade) => trade.durationCandles)),
        lossMfeAtLeast1R: losses.filter((trade) => trade.mfeR >= 1).length,
        lossMfeAtLeast2R: losses.filter((trade) => trade.mfeR >= 2).length,
    };
}
//# sourceMappingURL=backtest-statistics.helper.js.map