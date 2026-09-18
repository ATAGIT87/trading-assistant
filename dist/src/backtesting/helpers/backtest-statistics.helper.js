"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBacktestStatistics = calculateBacktestStatistics;
function average(values) {
    if (values.length === 0) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function calculateBacktestStatistics(trades) {
    const buyTrades = trades.filter((trade) => trade.action === "BUY");
    const sellTrades = trades.filter((trade) => trade.action === "SELL");
    const buyWins = buyTrades.filter((trade) => trade.result === "WIN");
    const buyLosses = buyTrades.filter((trade) => trade.result === "LOSS");
    const sellWins = sellTrades.filter((trade) => trade.result === "WIN");
    const sellLosses = sellTrades.filter((trade) => trade.result === "LOSS");
    const getTotalR = (tradesToCalculate) => tradesToCalculate.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);
    const getAdxBucket = (trade) => {
        if (trade.adx < 25) {
            return "below25";
        }
        if (trade.adx < 30) {
            return "25to30";
        }
        if (trade.adx < 35) {
            return "30to35";
        }
        if (trade.adx < 40) {
            return "35to40";
        }
        return "above40";
    };
    const sellAdxBuckets = {
        below25: sellTrades.filter((trade) => getAdxBucket(trade) === "below25"),
        "25to30": sellTrades.filter((trade) => getAdxBucket(trade) === "25to30"),
        "30to35": sellTrades.filter((trade) => getAdxBucket(trade) === "30to35"),
        "35to40": sellTrades.filter((trade) => getAdxBucket(trade) === "35to40"),
        above40: sellTrades.filter((trade) => getAdxBucket(trade) === "above40"),
    };
    const getBucketWins = (bucket) => bucket.filter((trade) => trade.result === "WIN").length;
    const winMaeValues = [...buyWins, ...sellWins].map((trade) => trade.maeR);
    const winMfeValues = [...buyWins, ...sellWins].map((trade) => trade.mfeR);
    const winDurationValues = [...buyWins, ...sellWins].map((trade) => trade.durationCandles);
    const lossMaeValues = [...buyLosses, ...sellLosses].map((trade) => trade.maeR);
    const lossMfeValues = [...buyLosses, ...sellLosses].map((trade) => trade.mfeR);
    const lossDurationValues = [...buyLosses, ...sellLosses].map((trade) => trade.durationCandles);
    const lossesWithMfeAtLeast1R = [...buyLosses, ...sellLosses].filter((trade) => trade.mfeR >= 1).length;
    const lossesWithMfeAtLeast2R = [...buyLosses, ...sellLosses].filter((trade) => trade.mfeR >= 2).length;
    return {
        sellAdxBelow25Trades: sellAdxBuckets.below25.length,
        sellAdxBelow25Wins: getBucketWins(sellAdxBuckets.below25),
        sellAdxBelow25R: getTotalR(sellAdxBuckets.below25),
        sellAdx25To30Trades: sellAdxBuckets["25to30"].length,
        sellAdx25To30Wins: getBucketWins(sellAdxBuckets["25to30"]),
        sellAdx25To30R: getTotalR(sellAdxBuckets["25to30"]),
        sellAdx30To35Trades: sellAdxBuckets["30to35"].length,
        sellAdx30To35Wins: getBucketWins(sellAdxBuckets["30to35"]),
        sellAdx30To35R: getTotalR(sellAdxBuckets["30to35"]),
        sellAdx35To40Trades: sellAdxBuckets["35to40"].length,
        sellAdx35To40Wins: getBucketWins(sellAdxBuckets["35to40"]),
        sellAdx35To40R: getTotalR(sellAdxBuckets["35to40"]),
        sellAdxAbove40Trades: sellAdxBuckets.above40.length,
        sellAdxAbove40Wins: getBucketWins(sellAdxBuckets.above40),
        sellAdxAbove40R: getTotalR(sellAdxBuckets.above40),
        sellWinAverageRsi: average(sellWins.map((trade) => trade.rsi)),
        sellLossAverageRsi: average(sellLosses.map((trade) => trade.rsi)),
        sellWinAverageAdx: average(sellWins.map((trade) => trade.adx)),
        sellLossAverageAdx: average(sellLosses.map((trade) => trade.adx)),
        buyWinAverageRsi: average(buyWins.map((trade) => trade.rsi)),
        buyLossAverageRsi: average(buyLosses.map((trade) => trade.rsi)),
        buyWinAverageAdx: average(buyWins.map((trade) => trade.adx)),
        buyLossAverageAdx: average(buyLosses.map((trade) => trade.adx)),
        buyTrades: buyTrades.length,
        buyWins: buyWins.length,
        buyLosses: buyLosses.length,
        buyTotalR: getTotalR(buyTrades),
        sellTrades: sellTrades.length,
        sellWins: sellWins.length,
        sellLosses: sellLosses.length,
        sellTotalR: getTotalR(sellTrades),
        winAverageMaeR: average(winMaeValues),
        winAverageMfeR: average(winMfeValues),
        winAverageDurationCandles: average(winDurationValues),
        lossAverageMaeR: average(lossMaeValues),
        lossAverageMfeR: average(lossMfeValues),
        lossAverageDurationCandles: average(lossDurationValues),
        lossMfeAtLeast1R: lossesWithMfeAtLeast1R,
        lossMfeAtLeast2R: lossesWithMfeAtLeast2R,
    };
}
//# sourceMappingURL=backtest-statistics.helper.js.map