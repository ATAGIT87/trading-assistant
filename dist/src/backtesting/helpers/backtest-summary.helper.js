"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBacktestSummary = calculateBacktestSummary;
function calculateBacktestSummary(trades) {
    const completedTrades = trades.filter((trade) => trade.result === "WIN" || trade.result === "LOSS");
    const winningTrades = completedTrades.filter((trade) => trade.result === "WIN").length;
    const losingTrades = completedTrades.filter((trade) => trade.result === "LOSS").length;
    const totalR = completedTrades.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);
    return {
        totalTrades: completedTrades.length,
        winningTrades,
        losingTrades,
        winRate: completedTrades.length === 0
            ? 0
            : (winningTrades / completedTrades.length) * 100,
        totalR,
        expectancyR: completedTrades.length === 0 ? 0 : totalR / completedTrades.length,
    };
}
//# sourceMappingURL=backtest-summary.helper.js.map