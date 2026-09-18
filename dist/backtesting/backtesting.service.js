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
exports.BacktestingService = void 0;
const common_1 = require("@nestjs/common");
const market_data_service_1 = require("../market-data/market-data.service");
const signals_service_1 = require("../signals/signals.service");
const backtest_outcome_helper_1 = require("./helpers/backtest-outcome.helper");
const backtest_summary_helper_1 = require("./helpers/backtest-summary.helper");
const backtest_statistics_helper_1 = require("./helpers/backtest-statistics.helper");
let BacktestingService = class BacktestingService {
    marketDataService;
    signalsService;
    FEE_RATE = 0.001;
    SLIPPAGE_RATE = 0.0005;
    constructor(marketDataService, signalsService) {
        this.marketDataService = marketDataService;
        this.signalsService = signalsService;
    }
    async run(symbol, timeframe) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        console.log("CANDLES:", candles.length);
        const period = 14;
        const splitIndex = Math.floor(candles.length * 0.7);
        const trainingCandles = candles.slice(0, splitIndex);
        const testCandles = candles.slice(splitIndex);
        console.log("TRAINING CANDLES:", trainingCandles.length);
        console.log("TEST CANDLES:", testCandles.length);
        console.log("TRAINING END:", trainingCandles[trainingCandles.length - 1]?.time);
        console.log("TEST START:", testCandles[0]?.time);
        const trades = [];
        const trainingTrades = [];
        const testTrades = [];
        let winningTrades = 0;
        let losingTrades = 0;
        let i = period * 2 - 1;
        while (i < candles.length) {
            const historicalCandles = await this.marketDataService.getHistoricalCandlesUntil(symbol, timeframe, candles[i].time);
            if (historicalCandles.length === 0 ||
                historicalCandles[historicalCandles.length - 1].time.getTime() !==
                    candles[i].time.getTime()) {
                throw new Error(`Look-ahead detected at ${candles[i].time.toISOString()}`);
            }
            const signal = await this.signalsService.generateSignalFromCandles(symbol, timeframe, historicalCandles);
            if (signal?.action !== "BUY" &&
                signal?.action !== "SELL") {
                i++;
                continue;
            }
            const futureCandles = candles.slice(i + 1);
            const outcome = (0, backtest_outcome_helper_1.findTradeOutcome)(signal, futureCandles);
            const result = outcome.result === true
                ? "WIN"
                : outcome.result === false
                    ? "LOSS"
                    : "OPEN";
            const riskAmount = signal.stopLoss === null
                ? 0
                : Math.abs(signal.entryPrice -
                    signal.stopLoss);
            const grossR = outcome.result === true
                ? 2
                : outcome.result === false
                    ? -1
                    : null;
            let netR = null;
            if (grossR !== null &&
                riskAmount > 0 &&
                outcome.exitPrice !== null) {
                const entryPrice = signal.entryPrice;
                const exitPrice = outcome.exitPrice;
                const entryExecutionPrice = signal.action === "BUY"
                    ? entryPrice *
                        (1 + this.SLIPPAGE_RATE)
                    : entryPrice *
                        (1 - this.SLIPPAGE_RATE);
                const exitExecutionPrice = signal.action === "BUY"
                    ? exitPrice *
                        (1 - this.SLIPPAGE_RATE)
                    : exitPrice *
                        (1 + this.SLIPPAGE_RATE);
                const entryFee = entryExecutionPrice *
                    this.FEE_RATE;
                const exitFee = exitExecutionPrice *
                    this.FEE_RATE;
                const totalTradingCost = entryFee +
                    exitFee;
                const priceSlippageCost = Math.abs(entryExecutionPrice -
                    entryPrice) +
                    Math.abs(exitExecutionPrice -
                        exitPrice);
                const totalCost = totalTradingCost +
                    priceSlippageCost;
                const costR = totalCost /
                    riskAmount;
                netR =
                    grossR -
                        costR;
            }
            const backtestTrade = {
                time: candles[i].time,
                action: signal.action,
                confidence: signal.confidence,
                entryPrice: signal.entryPrice,
                exitPrice: outcome.exitPrice,
                stopLoss: signal.stopLoss,
                takeProfit: signal.takeProfit,
                trend: signal.trend,
                rsi: signal.rsi,
                adx: signal.adx,
                marketCondition: signal.marketCondition,
                result,
                exitTime: outcome.exitIndex === null
                    ? null
                    : (futureCandles[outcome.exitIndex]?.time ?? null),
                riskAmount,
                resultR: netR,
                maeR: outcome.maeR,
                mfeR: outcome.mfeR,
                durationCandles: outcome.durationCandles,
            };
            trades.push(backtestTrade);
            if (i < splitIndex) {
                trainingTrades.push(backtestTrade);
            }
            else {
                testTrades.push(backtestTrade);
            }
            if (netR !== null) {
                if (netR > 0) {
                    winningTrades++;
                }
                else if (netR < 0) {
                    losingTrades++;
                }
            }
            if (outcome.exitIndex === null) {
                break;
            }
            i =
                i +
                    outcome.exitIndex +
                    2;
        }
        const completedTrades = winningTrades +
            losingTrades;
        const totalR = trades.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);
        const expectancyR = completedTrades === 0
            ? 0
            : totalR / completedTrades;
        const statistics = (0, backtest_statistics_helper_1.calculateBacktestStatistics)(trades);
        const training = (0, backtest_summary_helper_1.calculateBacktestSummary)(trainingTrades);
        const test = (0, backtest_summary_helper_1.calculateBacktestSummary)(testTrades);
        return {
            ...statistics,
            totalTrades: trades.length,
            winningTrades,
            losingTrades,
            winRate: completedTrades === 0
                ? 0
                : (winningTrades /
                    completedTrades) *
                    100,
            totalR,
            expectancyR,
            training,
            test,
            trades: [],
        };
    }
};
exports.BacktestingService = BacktestingService;
exports.BacktestingService = BacktestingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService,
        signals_service_1.SignalsService])
], BacktestingService);
//# sourceMappingURL=backtesting.service.js.map