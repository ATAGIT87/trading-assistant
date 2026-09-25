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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const timeframe_utils_1 = require("../assets/timeframe.utils");
const market_data_service_1 = require("../market-data/market-data.service");
const strategy_v2_service_1 = require("../signals/strategy-v2.service");
const backtest_outcome_helper_1 = require("./helpers/backtest-outcome.helper");
const backtest_statistics_helper_1 = require("./helpers/backtest-statistics.helper");
const backtest_summary_helper_1 = require("./helpers/backtest-summary.helper");
const sell_analysis_helper_1 = require("./helpers/sell-analysis.helper");
const backtest_run_entity_1 = require("./entities/backtest-run.entity");
let BacktestingService = class BacktestingService {
    marketDataService;
    strategyV2Service;
    configService;
    backtestRunRepository;
    feeRate;
    slippageRate;
    constructor(marketDataService, strategyV2Service, configService, backtestRunRepository) {
        this.marketDataService = marketDataService;
        this.strategyV2Service = strategyV2Service;
        this.configService = configService;
        this.backtestRunRepository = backtestRunRepository;
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
    async run(symbol, timeframe) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const higherTimeframe = (0, timeframe_utils_1.getHigherTimeframe)(timeframe);
        const higherTimeframeCandles = higherTimeframe === null
            ? []
            : await this.marketDataService.getHistoricalCandles(symbol, higherTimeframe);
        if (candles.length < 50) {
            return this.saveRun(symbol, timeframe, {
                strategyVersion: strategy_v2_service_1.STRATEGY_VERSION,
                higherTimeframeConfirmation: higherTimeframe !== null,
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
            });
        }
        const splitIndex = Math.floor(candles.length * 0.7);
        const trades = [];
        const trainingTrades = [];
        const testTrades = [];
        let grossTotalR = 0;
        let totalFeeR = 0;
        let totalSlippageR = 0;
        const processSegment = async (startIndex, endIndex, targetTrades) => {
            let i = Math.max(startIndex, 49);
            while (i < endIndex) {
                const historicalCandles = candles.slice(0, i + 1);
                const higherTimeframeTrend = higherTimeframe === null
                    ? undefined
                    : this.strategyV2Service.getTrend(higherTimeframeCandles.filter((candle) => candle.time.getTime() +
                        timeframe_utils_1.timeframeDurationMs[higherTimeframe] <=
                        candles[i].time.getTime()));
                if (higherTimeframe !== null && higherTimeframeTrend === null) {
                    i++;
                    continue;
                }
                const signal = this.strategyV2Service.evaluateCandles(historicalCandles, 0, historicalCandles.length, higherTimeframeTrend ?? undefined);
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
        await processSegment(0, splitIndex, trainingTrades);
        await processSegment(splitIndex, candles.length, testTrades);
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
        return this.saveRun(symbol, timeframe, {
            strategyVersion: strategy_v2_service_1.STRATEGY_VERSION,
            higherTimeframeConfirmation: higherTimeframe !== null,
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
        });
    }
    async findRuns(symbol, timeframe) {
        return this.backtestRunRepository.find({
            where: { symbol, timeframe },
            order: { createdAt: "DESC" },
            take: 20,
        });
    }
    async getReadiness(symbol, timeframe) {
        const latestRun = await this.backtestRunRepository.findOne({
            where: { symbol, timeframe, strategyVersion: strategy_v2_service_1.STRATEGY_VERSION },
            order: { createdAt: "DESC" },
        });
        if (!latestRun) {
            return {
                isReady: false,
                reason: "No backtest exists for the active strategy version.",
            };
        }
        const test = latestRun.result.test;
        const isReady = test.totalTrades >= 20 && test.totalR > 0 && test.expectancyR > 0;
        return {
            isReady,
            reason: isReady
                ? "Out-of-sample backtest criteria passed."
                : `Out-of-sample criteria failed: trades=${test.totalTrades}, totalR=${test.totalR.toFixed(2)}, expectancyR=${test.expectancyR.toFixed(2)}.`,
            runId: latestRun.id,
            test,
        };
    }
    async compareLatestRuns(symbol, timeframe, baselineVersion, candidateVersion) {
        const [baseline, candidate] = await Promise.all([
            this.backtestRunRepository.findOne({
                where: { symbol, timeframe, strategyVersion: baselineVersion },
                order: { createdAt: "DESC" },
            }),
            this.backtestRunRepository.findOne({
                where: { symbol, timeframe, strategyVersion: candidateVersion },
                order: { createdAt: "DESC" },
            }),
        ]);
        if (!baseline || !candidate) {
            return null;
        }
        return {
            baseline,
            candidate,
            delta: {
                totalR: candidate.result.totalR - baseline.result.totalR,
                expectancyR: candidate.result.expectancyR - baseline.result.expectancyR,
                winRate: candidate.result.winRate - baseline.result.winRate,
                testTotalR: candidate.result.test.totalR - baseline.result.test.totalR,
                testExpectancyR: candidate.result.test.expectancyR - baseline.result.test.expectancyR,
            },
        };
    }
    async saveRun(symbol, timeframe, result) {
        await this.backtestRunRepository.save(this.backtestRunRepository.create({
            symbol,
            timeframe,
            strategyVersion: result.strategyVersion,
            result,
        }));
        return result;
    }
};
exports.BacktestingService = BacktestingService;
exports.BacktestingService = BacktestingService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(backtest_run_entity_1.BacktestRun)),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService,
        strategy_v2_service_1.StrategyV2Service,
        config_1.ConfigService,
        typeorm_2.Repository])
], BacktestingService);
//# sourceMappingURL=backtesting.service.js.map