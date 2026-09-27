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
const trading_symbol_1 = require("../market-data/trading-symbol");
const strategy_registry_service_1 = require("../signals/strategy-registry.service");
const backtest_outcome_helper_1 = require("./helpers/backtest-outcome.helper");
const backtest_execution_helper_1 = require("./helpers/backtest-execution.helper");
const backtest_statistics_helper_1 = require("./helpers/backtest-statistics.helper");
const backtest_summary_helper_1 = require("./helpers/backtest-summary.helper");
const backtest_run_entity_1 = require("./entities/backtest-run.entity");
const spot_trading_policy_1 = require("../trading/spot-trading-policy");
const portfolio_backtest_helper_1 = require("./helpers/portfolio-backtest.helper");
const portfolio_capacity_helper_1 = require("./helpers/portfolio-capacity.helper");
const walk_forward_helper_1 = require("./helpers/walk-forward.helper");
const backtest_periods_helper_1 = require("./helpers/backtest-periods.helper");
const market_data_quality_1 = require("../market-data/market-data-quality");
let BacktestingService = class BacktestingService {
    marketDataService;
    strategyRegistry;
    configService;
    backtestRunRepository;
    feeRate;
    slippageRate;
    constructor(marketDataService, strategyRegistry, configService, backtestRunRepository) {
        this.marketDataService = marketDataService;
        this.strategyRegistry = strategyRegistry;
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
    toNumericCandles(candles) {
        return candles.map((candle) => ({
            ...candle,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: Number(candle.volume),
        }));
    }
    async run(symbol, timeframe, strategyVersion, includeProtectedHoldout = false) {
        const strategy = this.strategyRegistry.get(strategyVersion);
        if (!strategy.supportedTimeframes.includes(timeframe)) {
            throw new common_1.BadRequestException(`Strategy ${strategy.version} is not defined for ${timeframe}.`);
        }
        const holdoutDays = Math.floor(this.getNumericConfigValue("BACKTEST_HOLDOUT_DAYS", 365));
        const protectedHoldoutStart = new Date(Date.now() - holdoutDays * 24 * 60 * 60 * 1000);
        const allCandles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const scopedCandles = includeProtectedHoldout
            ? allCandles
            : allCandles.filter((candle) => candle.time < protectedHoldoutStart);
        const candles = this.toNumericCandles((0, market_data_quality_1.getLatestContinuousCandleSegment)(scopedCandles, timeframe));
        const higherTimeframe = strategy.requiresHigherTimeframeConfirmation
            ? (0, timeframe_utils_1.getHigherTimeframe)(timeframe)
            : null;
        const allHigherTimeframeCandles = higherTimeframe === null
            ? []
            : await this.marketDataService.getHistoricalCandles(symbol, higherTimeframe);
        const scopedHigherTimeframeCandles = includeProtectedHoldout
            ? allHigherTimeframeCandles
            : allHigherTimeframeCandles.filter((candle) => candle.time < protectedHoldoutStart);
        const higherTimeframeCandles = higherTimeframe === null
            ? []
            : this.toNumericCandles((0, market_data_quality_1.getLatestContinuousCandleSegment)(scopedHigherTimeframeCandles, higherTimeframe));
        const primaryDataQuality = (0, market_data_quality_1.assessMarketDataQuality)(symbol, timeframe, candles);
        const higherTimeframeDataQuality = higherTimeframe === null
            ? null
            : (0, market_data_quality_1.assessMarketDataQuality)(symbol, higherTimeframe, higherTimeframeCandles);
        if (!primaryDataQuality.isUsableForResearch ||
            (higherTimeframeDataQuality !== null &&
                !higherTimeframeDataQuality.isUsableForResearch)) {
            throw new common_1.BadRequestException(`Backtest blocked by market-data quality: primary=${primaryDataQuality.reason}` +
                (higherTimeframeDataQuality === null
                    ? ""
                    : ` higher=${higherTimeframeDataQuality.reason}`));
        }
        const researchContext = {
            engineVersion: "spot-long-only-v2",
            codeRevision: this.configService.get("APP_REVISION", "local"),
            feeRate: this.feeRate,
            slippageRate: this.slippageRate,
            protectedHoldoutStart: protectedHoldoutStart.toISOString(),
            primaryCandleRange: {
                firstCandleTime: primaryDataQuality.firstCandleTime,
                lastCompletedCandleTime: primaryDataQuality.lastCompletedCandleTime,
            },
        };
        const periods = (0, backtest_periods_helper_1.buildBacktestPeriods)(candles, protectedHoldoutStart, includeProtectedHoldout);
        if (periods.selectionTestEndIndex < 50) {
            return this.saveRun(symbol, timeframe, {
                strategyVersion: strategy.version,
                researchContext,
                dataQuality: {
                    primary: primaryDataQuality,
                    higherTimeframe: higherTimeframeDataQuality,
                },
                higherTimeframeConfirmation: higherTimeframe !== null,
                includesProtectedHoldout: includeProtectedHoldout,
                protectedHoldoutDays: holdoutDays,
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
                validation: (0, backtest_summary_helper_1.calculateBacktestSummary)([]),
                test: (0, backtest_summary_helper_1.calculateBacktestSummary)([]),
                protectedHoldout: includeProtectedHoldout
                    ? (0, backtest_summary_helper_1.calculateBacktestSummary)([])
                    : null,
                trades: [],
            });
        }
        const trades = [];
        const trainingTrades = [];
        const validationTrades = [];
        const testTrades = [];
        const protectedHoldoutTrades = [];
        let grossTotalR = 0;
        let totalFeeR = 0;
        let totalSlippageR = 0;
        const processSegment = async (startIndex, endIndex, targetTrades, segment) => {
            let i = Math.max(startIndex, strategy.minimumHistory - 1);
            let higherTimeframeEndIndex = 0;
            while (i < endIndex) {
                const historicalCandles = candles.slice(Math.max(0, i + 1 - strategy.minimumHistory), i + 1);
                while (higherTimeframe !== null &&
                    higherTimeframeEndIndex < higherTimeframeCandles.length &&
                    higherTimeframeCandles[higherTimeframeEndIndex].time.getTime() +
                        timeframe_utils_1.timeframeDurationMs[higherTimeframe] <=
                        candles[i].time.getTime()) {
                    higherTimeframeEndIndex++;
                }
                const higherTimeframeTrend = higherTimeframe === null
                    ? undefined
                    : strategy.getTrend(higherTimeframeCandles.slice(Math.max(0, higherTimeframeEndIndex - strategy.minimumHistory), higherTimeframeEndIndex));
                if (higherTimeframe !== null && higherTimeframeTrend === null) {
                    i++;
                    continue;
                }
                const decisionSignal = strategy.evaluateCandles(historicalCandles, 0, historicalCandles.length, higherTimeframeTrend ?? undefined, symbol);
                if (!(0, spot_trading_policy_1.isAllowedSpotEntry)(decisionSignal.action)) {
                    i++;
                    continue;
                }
                if (decisionSignal.stopLoss === null ||
                    decisionSignal.takeProfit === null) {
                    i++;
                    continue;
                }
                const futureCandles = candles.slice(i + 1, endIndex);
                if (futureCandles.length === 0) {
                    break;
                }
                const signal = (0, backtest_execution_helper_1.executeSignalAtNextOpen)(decisionSignal, futureCandles[0]);
                if (signal === null) {
                    i++;
                    continue;
                }
                const outcome = (0, backtest_outcome_helper_1.findTradeOutcome)(signal, futureCandles, strategy.maxHoldingCandles);
                const result = outcome.result === true
                    ? "WIN"
                    : outcome.result === false
                        ? "LOSS"
                        : "OPEN";
                const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);
                const grossR = this.calculateGrossR(signal, outcome.exitPrice, outcome.exitReason);
                let feeR = 0;
                let slippageR = 0;
                let netR = grossR;
                if (grossR !== null && riskAmount > 0) {
                    const entryPrice = signal.entryPrice;
                    const exitPrice = outcome.exitPrice ?? entryPrice;
                    const entryFee = entryPrice * this.feeRate;
                    const exitFee = exitPrice * this.feeRate;
                    feeR = (entryFee + exitFee) / riskAmount;
                    const entrySlippage = entryPrice * this.slippageRate;
                    const exitSlippage = exitPrice * this.slippageRate;
                    slippageR = (entrySlippage + exitSlippage) / riskAmount;
                    netR = grossR - feeR - slippageR;
                }
                const backtestTrade = {
                    symbol,
                    segment,
                    time: futureCandles[0].time,
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
                    exitReason: outcome.exitReason,
                    exitTime: outcome.exitIndex === null
                        ? null
                        : (futureCandles[outcome.exitIndex]?.time ?? null),
                    riskAmount,
                    grossR,
                    feeR,
                    slippageR,
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
                totalSlippageR += slippageR;
                if (outcome.exitIndex === null) {
                    break;
                }
                i = i + outcome.exitIndex + 2;
            }
        };
        await processSegment(0, periods.trainingEndIndex, trainingTrades, "training");
        await processSegment(periods.trainingEndIndex, periods.validationEndIndex, validationTrades, "validation");
        await processSegment(periods.validationEndIndex, periods.selectionTestEndIndex, testTrades, "test");
        if (periods.protectedHoldoutStartIndex !== null) {
            await processSegment(periods.protectedHoldoutStartIndex, candles.length, protectedHoldoutTrades, "protectedHoldout");
        }
        const winningTrades = trades.filter((trade) => trade.resultR !== null && trade.resultR > 0).length;
        const losingTrades = trades.filter((trade) => trade.resultR !== null && trade.resultR < 0).length;
        const completedTrades = winningTrades + losingTrades;
        const totalR = trades.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);
        const expectancyR = completedTrades === 0 ? 0 : totalR / completedTrades;
        const statistics = (0, backtest_statistics_helper_1.calculateBacktestStatistics)(trades);
        const training = (0, backtest_summary_helper_1.calculateBacktestSummary)(trainingTrades);
        const test = (0, backtest_summary_helper_1.calculateBacktestSummary)(testTrades);
        const validation = (0, backtest_summary_helper_1.calculateBacktestSummary)(validationTrades);
        const protectedHoldout = periods.protectedHoldoutStartIndex === null
            ? null
            : (0, backtest_summary_helper_1.calculateBacktestSummary)(protectedHoldoutTrades);
        return this.saveRun(symbol, timeframe, {
            strategyVersion: strategy.version,
            researchContext,
            dataQuality: {
                primary: primaryDataQuality,
                higherTimeframe: higherTimeframeDataQuality,
            },
            higherTimeframeConfirmation: higherTimeframe !== null,
            includesProtectedHoldout: includeProtectedHoldout,
            protectedHoldoutDays: holdoutDays,
            ...statistics,
            totalTrades: trades.length,
            winningTrades,
            losingTrades,
            winRate: completedTrades === 0 ? 0 : (winningTrades / completedTrades) * 100,
            totalR,
            expectancyR,
            grossTotalR,
            totalFeeR,
            totalSlippageR,
            totalCostR: totalFeeR + totalSlippageR,
            training,
            validation,
            test,
            protectedHoldout,
            trades,
        });
    }
    async runPortfolio(timeframe, strategyVersion) {
        const results = [];
        for (const symbol of trading_symbol_1.supportedTradingSymbols) {
            results.push({
                symbol,
                result: await this.run(symbol, timeframe, strategyVersion, false),
            });
        }
        return (0, portfolio_backtest_helper_1.aggregatePortfolioBacktests)(timeframe, results, this.getMaxPortfolioPositions());
    }
    async runWalkForwardPortfolio(timeframe, strategyVersion) {
        const strategy = this.strategyRegistry.get(strategyVersion);
        const symbolResults = await Promise.all(trading_symbol_1.supportedTradingSymbols.map(async (symbol) => ({
            symbol,
            ...(await this.runWalkForwardSymbol(symbol, timeframe, strategy)),
        })));
        const reference = symbolResults[0];
        return {
            strategyVersion: strategy.version,
            timeframe,
            includesProtectedHoldout: false,
            folds: (reference?.windows ?? []).map((window) => {
                const bySymbol = symbolResults.map(({ symbol, trades, candles }) => {
                    const entry = Number(candles[window.startIndex + 1]?.open);
                    const exit = Number(candles[window.endIndex - 1]?.close);
                    const benchmarkBuyAndHoldReturnPct = entry > 0 && Number.isFinite(exit)
                        ? ((exit - entry) / entry) * 100
                        : 0;
                    return {
                        symbol,
                        summary: (0, backtest_summary_helper_1.calculateBacktestSummary)(trades[window.index - 1] ?? []),
                        benchmarkBuyAndHoldReturnPct,
                    };
                });
                const acceptedTrades = (0, portfolio_capacity_helper_1.applyPortfolioCapacity)(symbolResults.flatMap(({ trades }) => trades[window.index - 1] ?? []), this.getMaxPortfolioPositions());
                const summary = (0, backtest_summary_helper_1.calculateBacktestSummary)(acceptedTrades);
                return {
                    fold: window.index,
                    startsAt: reference.candles[window.startIndex].time,
                    endsAt: reference.candles[window.endIndex - 1].time,
                    aggregate: {
                        ...summary,
                        benchmarkBuyAndHoldReturnPct: bySymbol.reduce((sum, member) => sum + member.benchmarkBuyAndHoldReturnPct, 0) / bySymbol.length,
                    },
                    bySymbol,
                };
            }),
        };
    }
    async runWalkForwardSymbol(symbol, timeframe, strategy) {
        const holdoutDays = Math.floor(this.getNumericConfigValue("BACKTEST_HOLDOUT_DAYS", 365));
        const protectedHoldoutStart = new Date(Date.now() - holdoutDays * 24 * 60 * 60 * 1000);
        const candles = (await this.marketDataService.getHistoricalCandles(symbol, timeframe)).filter((candle) => candle.time < protectedHoldoutStart);
        const higherTimeframe = strategy.requiresHigherTimeframeConfirmation
            ? (0, timeframe_utils_1.getHigherTimeframe)(timeframe)
            : null;
        const higherCandles = higherTimeframe === null
            ? []
            : (await this.marketDataService.getHistoricalCandles(symbol, higherTimeframe)).filter((candle) => candle.time < protectedHoldoutStart);
        const windows = (0, walk_forward_helper_1.buildWalkForwardWindows)(candles.length, strategy.minimumHistory);
        return {
            candles,
            windows,
            trades: windows.map((window) => this.simulateWalkForwardWindow(symbol, candles, higherCandles, timeframe, higherTimeframe, strategy, window.startIndex, window.endIndex)),
        };
    }
    simulateWalkForwardWindow(symbol, candles, higherCandles, timeframe, higherTimeframe, strategy, startIndex, endIndex) {
        const trades = [];
        let i = startIndex;
        let higherIndex = 0;
        while (higherTimeframe !== null &&
            higherIndex < higherCandles.length &&
            higherCandles[higherIndex].time.getTime() +
                timeframe_utils_1.timeframeDurationMs[higherTimeframe] <=
                candles[i].time.getTime()) {
            higherIndex++;
        }
        while (i < endIndex) {
            const historical = candles.slice(Math.max(0, i + 1 - strategy.minimumHistory), i + 1);
            while (higherTimeframe !== null &&
                higherIndex < higherCandles.length &&
                higherCandles[higherIndex].time.getTime() +
                    timeframe_utils_1.timeframeDurationMs[higherTimeframe] <=
                    candles[i].time.getTime()) {
                higherIndex++;
            }
            const higherTrend = higherTimeframe === null
                ? undefined
                : strategy.getTrend(higherCandles.slice(Math.max(0, higherIndex - strategy.minimumHistory), higherIndex));
            const decision = strategy.evaluateCandles(historical, 0, historical.length, higherTrend ?? undefined, symbol);
            if (!(0, spot_trading_policy_1.isAllowedSpotEntry)(decision.action) ||
                decision.stopLoss === null ||
                decision.takeProfit === null) {
                i++;
                continue;
            }
            const future = candles.slice(i + 1, endIndex);
            const signal = future.length === 0
                ? null
                : (0, backtest_execution_helper_1.executeSignalAtNextOpen)(decision, future[0]);
            if (signal === null) {
                i++;
                continue;
            }
            const outcome = (0, backtest_outcome_helper_1.findTradeOutcome)(signal, future, strategy.maxHoldingCandles);
            const result = outcome.result === true
                ? "WIN"
                : outcome.result === false
                    ? "LOSS"
                    : "OPEN";
            const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);
            const grossR = this.calculateGrossR(signal, outcome.exitPrice, outcome.exitReason);
            const exitPrice = outcome.exitPrice ?? signal.entryPrice;
            const costR = grossR === null || riskAmount <= 0
                ? 0
                : ((signal.entryPrice + exitPrice) *
                    (this.feeRate + this.slippageRate)) /
                    riskAmount;
            trades.push({
                symbol,
                segment: "test",
                time: future[0].time,
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
                exitReason: outcome.exitReason,
                exitTime: outcome.exitIndex === null
                    ? null
                    : (future[outcome.exitIndex]?.time ?? null),
                riskAmount,
                grossR,
                feeR: grossR === null
                    ? 0
                    : ((signal.entryPrice + exitPrice) * this.feeRate) / riskAmount,
                slippageR: grossR === null
                    ? 0
                    : ((signal.entryPrice + exitPrice) * this.slippageRate) /
                        riskAmount,
                resultR: grossR === null ? null : grossR - costR,
                maeR: outcome.maeR,
                mfeR: outcome.mfeR,
                durationCandles: outcome.durationCandles,
            });
            if (outcome.exitIndex === null)
                break;
            i += outcome.exitIndex + 2;
        }
        return trades;
    }
    calculateGrossR(signal, exitPrice, exitReason) {
        const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);
        if (riskAmount <= 0 || exitPrice === null || exitReason === null) {
            return null;
        }
        const priceMove = signal.action === "BUY"
            ? exitPrice - signal.entryPrice
            : signal.entryPrice - exitPrice;
        return priceMove / riskAmount;
    }
    async findRuns(symbol, timeframe) {
        return this.backtestRunRepository.find({
            where: { symbol, timeframe },
            order: { createdAt: "DESC" },
            take: 20,
        });
    }
    async getReadiness(symbol, timeframe) {
        const activeStrategyVersion = this.strategyRegistry.getActiveVersion();
        if (!activeStrategyVersion) {
            return {
                isReady: false,
                strategyVersion: null,
                reason: "No strategy is active. Research must register and approve a new candidate before Demo can be enabled.",
            };
        }
        const activeStrategy = this.strategyRegistry.getActive();
        if (activeStrategy?.evaluationScope === "PORTFOLIO") {
            return this.getPortfolioReadiness(timeframe, activeStrategyVersion, activeStrategy.minimumTradesPerSegment, activeStrategy.minimumContributingSymbols);
        }
        const latestRun = await this.backtestRunRepository.findOne({
            where: { symbol, timeframe, strategyVersion: activeStrategyVersion },
            order: { createdAt: "DESC" },
        });
        const symbolReadiness = this.evaluateRunReadiness(latestRun);
        if (!symbolReadiness.isReady) {
            return {
                ...symbolReadiness,
                strategyVersion: activeStrategyVersion,
            };
        }
        const portfolioRuns = await this.backtestRunRepository.find({
            where: { timeframe, strategyVersion: activeStrategyVersion },
            order: { createdAt: "DESC" },
        });
        const latestRunBySymbol = new Map();
        for (const run of portfolioRuns) {
            if (!latestRunBySymbol.has(run.symbol)) {
                latestRunBySymbol.set(run.symbol, run);
            }
        }
        const portfolioFailures = trading_symbol_1.supportedTradingSymbols
            .map((requiredSymbol) => ({
            symbol: requiredSymbol,
            readiness: this.evaluateRunReadiness(latestRunBySymbol.get(requiredSymbol)),
        }))
            .filter(({ readiness }) => !readiness.isReady);
        if (portfolioFailures.length > 0) {
            return {
                isReady: false,
                strategyVersion: activeStrategyVersion,
                runId: latestRun?.id,
                validation: latestRun?.result.validation,
                test: latestRun?.result.test,
                reason: `Portfolio approval blocked: ${portfolioFailures.map(({ symbol: failedSymbol, readiness }) => `${failedSymbol} (${readiness.reason})`).join("; ")}`,
            };
        }
        return {
            ...symbolReadiness,
            strategyVersion: activeStrategyVersion,
            reason: "Out-of-sample criteria passed for every supported trading symbol.",
        };
    }
    async getPortfolioReadiness(timeframe, strategyVersion, minimumTradesPerSegment, minimumContributingSymbols) {
        const runs = await this.backtestRunRepository.find({
            where: { timeframe, strategyVersion },
            order: { createdAt: "DESC" },
        });
        const latestBySymbol = new Map();
        for (const run of runs) {
            if (!latestBySymbol.has(run.symbol))
                latestBySymbol.set(run.symbol, run);
        }
        const members = trading_symbol_1.supportedTradingSymbols.map((symbol) => latestBySymbol.get(symbol));
        const missing = trading_symbol_1.supportedTradingSymbols.filter((symbol) => !latestBySymbol.has(symbol));
        if (missing.length > 0) {
            return {
                isReady: false,
                strategyVersion,
                reason: `Portfolio approval blocked: missing current runs for ${missing.join(", ")}.`,
            };
        }
        const completeRuns = members;
        const invalidRun = completeRuns.find((run) => !run.result.dataQuality?.primary?.isUsableForResearch ||
            (run.result.dataQuality?.higherTimeframe !== null &&
                !run.result.dataQuality?.higherTimeframe?.isUsableForResearch) ||
            !run.result.includesProtectedHoldout ||
            !run.result.protectedHoldout);
        if (invalidRun) {
            return {
                isReady: false,
                strategyVersion,
                reason: "Portfolio approval blocked: every member needs a current, quality-approved run with a separate protected holdout.",
            };
        }
        const maxOpenPositions = this.getMaxPortfolioPositions();
        const aggregate = (segment) => {
            const eligibleTrades = completeRuns.flatMap((run) => run.result.trades.filter((trade) => trade.segment === segment));
            const acceptedTrades = (0, portfolio_capacity_helper_1.applyPortfolioCapacity)(eligibleTrades, maxOpenPositions);
            const totalTrades = acceptedTrades.length;
            const totalR = acceptedTrades.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);
            return {
                totalTrades,
                totalR,
                expectancyR: totalTrades === 0 ? 0 : totalR / totalTrades,
                contributingSymbols: new Set(acceptedTrades.map((trade) => trade.symbol)).size,
            };
        };
        const validation = aggregate("validation");
        const test = aggregate("test");
        const protectedHoldout = aggregate("protectedHoldout");
        const segments = [validation, test, protectedHoldout];
        const isReady = segments.every((segment) => segment.totalTrades >= minimumTradesPerSegment &&
            segment.totalR > 0 &&
            segment.expectancyR > 0 &&
            segment.contributingSymbols >= minimumContributingSymbols);
        return {
            isReady,
            strategyVersion,
            evaluationScope: "PORTFOLIO",
            validation,
            test,
            protectedHoldout,
            reason: isReady
                ? "Capacity-constrained portfolio out-of-sample and protected-holdout criteria passed."
                : `Portfolio criteria failed: with at most ${maxOpenPositions} open position(s), require >=${minimumTradesPerSegment} trades, positive net R/expectancy, and >=${minimumContributingSymbols} contributing symbols in every segment.`,
        };
    }
    getMaxPortfolioPositions() {
        const configured = Number(this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1));
        return Number.isInteger(configured) && configured > 0 ? configured : 1;
    }
    evaluateRunReadiness(run) {
        if (!run) {
            return {
                isReady: false,
                reason: "No backtest exists for this strategy version.",
            };
        }
        const validation = run.result.validation;
        const test = run.result.test;
        const protectedHoldout = run.result.protectedHoldout;
        if (!run.result.dataQuality?.primary?.isUsableForResearch ||
            (run.result.dataQuality?.higherTimeframe !== null &&
                !run.result.dataQuality?.higherTimeframe?.isUsableForResearch)) {
            return {
                isReady: false,
                reason: "Latest backtest has not passed the market-data quality gate.",
                runId: run.id,
            };
        }
        if (!run.result.includesProtectedHoldout) {
            return {
                isReady: false,
                reason: "Latest backtest did not include the protected final holdout.",
                runId: run.id,
            };
        }
        if (!validation || !test || !protectedHoldout) {
            return {
                isReady: false,
                reason: "Latest backtest was created before the protected-holdout gate was introduced.",
                runId: run.id,
            };
        }
        const isReady = validation.totalTrades >= 20 &&
            validation.totalR > 0 &&
            validation.expectancyR > 0 &&
            test.totalTrades >= 20 &&
            test.totalR > 0 &&
            test.expectancyR > 0 &&
            protectedHoldout.totalTrades >= 20 &&
            protectedHoldout.totalR > 0 &&
            protectedHoldout.expectancyR > 0;
        return {
            isReady,
            reason: isReady
                ? "Out-of-sample backtest criteria passed."
                : `Validation/test/holdout criteria failed: validationR=${validation.totalR.toFixed(2)}, testR=${test.totalR.toFixed(2)}, holdoutR=${protectedHoldout.totalR.toFixed(2)}.`,
            runId: run.id,
            validation,
            test,
            protectedHoldout,
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
        strategy_registry_service_1.StrategyRegistryService,
        config_1.ConfigService,
        typeorm_2.Repository])
], BacktestingService);
//# sourceMappingURL=backtesting.service.js.map