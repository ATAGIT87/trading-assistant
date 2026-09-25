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
const config_1 = require("@nestjs/config");
const market_data_service_1 = require("../market-data/market-data.service");
const strategy_v2_service_1 = require("../signals/strategy-v2.service");
const backtest_outcome_helper_1 = require("./helpers/backtest-outcome.helper");
const backtest_statistics_helper_1 = require("./helpers/backtest-statistics.helper");
const backtest_summary_helper_1 = require("./helpers/backtest-summary.helper");
const sell_analysis_helper_1 = require("./helpers/sell-analysis.helper");
let BacktestingService = class BacktestingService {
    marketDataService;
    strategyV2Service;
    configService;
    feeRate;
    slippageRate;
    constructor(marketDataService, strategyV2Service, configService) {
        this.marketDataService = marketDataService;
        this.strategyV2Service = strategyV2Service;
        this.configService = configService;
        this.feeRate = this.getNumericConfigValue("BACKTESTING_FEE_RATE", 0.0005);
        this.slippageRate = this.getNumericConfigValue("BACKTESTING_SLIPPAGE_RATE", 0.0005);
    }
    getNumericConfigValue(key, fallback) {
        const value = Number(this.configService.get(key, fallback));
        if (!Number.isFinite(value) || value < 0) {
            return fallback;
        }
        return value;
    }
    async run(symbol, timeframe, _useHigherTimeframeConfirmation = false, _excludeHighAdxSell = false) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length < 50) {
            return {
                ...(0, backtest_statistics_helper_1.calculateBacktestStatistics)([]),
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                winRate: 0,
                totalR: 0,
                expectancyR: 0,
                grossTotalR: 0,
                totalFeeR: 0,
                totalSlippageR: 0,
                totalCostR: 0,
                training: (0, backtest_summary_helper_1.calculateBacktestSummary)([]),
                test: (0, backtest_summary_helper_1.calculateBacktestSummary)([]),
                trades: [],
            };
        }
        const splitIndex = Math.floor(candles.length * 0.7);
        const trades = [];
        const trainingTrades = [];
        const testTrades = [];
        let grossTotalR = 0;
        let totalFeeR = 0;
        let totalSlippageR = 0;
        const processSegment = (startIndex, endIndex, targetTrades) => {
            let i = Math.max(startIndex, 49);
            while (i < endIndex) {
                const historicalCandles = candles.slice(0, i + 1);
                const signal = this.strategyV2Service.evaluateCandles(historicalCandles, 0, historicalCandles.length);
                if (signal.action !== "BUY" &&
                    signal.action !== "SELL") {
                    i++;
                    continue;
                }
                if (signal.stopLoss === null ||
                    signal.takeProfit === null) {
                    i++;
                    continue;
                }
                const futureCandles = candles.slice(i + 1, endIndex);
                if (futureCandles.length === 0) {
                    break;
                }
                const outcome = (0, backtest_outcome_helper_1.findTradeOutcome)(signal, futureCandles);
                const result = outcome.result === true
                    ? "WIN"
                    : outcome.result === false
                        ? "LOSS"
                        : "OPEN";
                const riskAmount = Math.abs(signal.entryPrice -
                    signal.stopLoss);
                const grossR = outcome.result === true
                    ? 2
                    : outcome.result === false
                        ? -1
                        : null;
                let feeR = 0;
                let slippageR = 0;
                let netR = grossR;
                if (grossR !== null &&
                    riskAmount > 0) {
                    const entryPrice = signal.entryPrice;
                    const exitPrice = outcome.exitPrice ??
                        entryPrice;
                    const entryFee = entryPrice *
                        this.feeRate;
                    const exitFee = exitPrice *
                        this.feeRate;
                    feeR =
                        (entryFee + exitFee) /
                            riskAmount;
                    const entrySlippage = entryPrice *
                        this.slippageRate;
                    const exitSlippage = exitPrice *
                        this.slippageRate;
                    slippageR =
                        (entrySlippage +
                            exitSlippage) /
                            riskAmount;
                    netR =
                        grossR -
                            feeR -
                            slippageR;
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
                targetTrades.push(backtestTrade);
                if (grossR !== null) {
                    grossTotalR += grossR;
                }
                totalFeeR += feeR;
                totalSlippageR +=
                    slippageR;
                if (outcome.exitIndex === null) {
                    break;
                }
                i =
                    i +
                        outcome.exitIndex +
                        2;
            }
        };
        processSegment(0, splitIndex, trainingTrades);
        processSegment(splitIndex, candles.length, testTrades);
        const winningTrades = trades.filter((trade) => trade.resultR !== null &&
            trade.resultR > 0).length;
        const losingTrades = trades.filter((trade) => trade.resultR !== null &&
            trade.resultR < 0).length;
        const completedTrades = winningTrades +
            losingTrades;
        const totalR = trades.reduce((sum, trade) => sum +
            (trade.resultR ?? 0), 0);
        const expectancyR = completedTrades === 0
            ? 0
            : totalR /
                completedTrades;
        const statistics = (0, backtest_statistics_helper_1.calculateBacktestStatistics)(trades);
        const training = (0, backtest_summary_helper_1.calculateBacktestSummary)(trainingTrades);
        const test = (0, backtest_summary_helper_1.calculateBacktestSummary)(testTrades);
        const sellAnalysis = (0, sell_analysis_helper_1.analyzeSellTrades)(trades);
        console.log("\n========== SELL ANALYSIS ==========");
        console.table(sellAnalysis);
        console.log("===================================\n");
        console.log("\n========== V2 BACKTEST ==========");
        console.log({
            totalTrades: trades.length,
            winningTrades,
            losingTrades,
            winRate: completedTrades === 0
                ? 0
                : (winningTrades /
                    completedTrades) * 100,
            totalR,
            expectancyR,
        });
        console.log("=================================\n");
        return {
            ...statistics,
            totalTrades: trades.length,
            winningTrades,
            losingTrades,
            winRate: completedTrades === 0
                ? 0
                : (winningTrades /
                    completedTrades) * 100,
            totalR,
            expectancyR,
            grossTotalR,
            totalFeeR,
            totalSlippageR,
            totalCostR: totalFeeR +
                totalSlippageR,
            training,
            test,
            trades,
        };
    }
};
exports.BacktestingService = BacktestingService;
exports.BacktestingService = BacktestingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService,
        strategy_v2_service_1.StrategyV2Service,
        config_1.ConfigService])
], BacktestingService);
//# sourceMappingURL=backtesting.service.js.map