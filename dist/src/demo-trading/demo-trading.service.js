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
exports.DemoTradingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const market_data_service_1 = require("../market-data/market-data.service");
const signals_service_1 = require("../signals/signals.service");
const strategy_registry_service_1 = require("../signals/strategy-registry.service");
const backtesting_service_1 = require("../backtesting/backtesting.service");
const demo_position_entity_1 = require("./entities/demo-position.entity");
const spot_trading_policy_1 = require("../trading/spot-trading-policy");
let DemoTradingService = class DemoTradingService {
    demoPositionRepository;
    signalsService;
    marketDataService;
    backtestingService;
    strategyRegistry;
    configService;
    constructor(demoPositionRepository, signalsService, marketDataService, backtestingService, strategyRegistry, configService) {
        this.demoPositionRepository = demoPositionRepository;
        this.signalsService = signalsService;
        this.marketDataService = marketDataService;
        this.backtestingService = backtestingService;
        this.strategyRegistry = strategyRegistry;
        this.configService = configService;
    }
    resolvePositionOutcome(position, candle) {
        const candleLow = Number(candle.low);
        const candleHigh = Number(candle.high);
        const stopLoss = Number(position.stopLoss);
        const takeProfit = Number(position.takeProfit);
        if (position.side === "BUY") {
            const stopTriggered = candleLow <= stopLoss;
            const takeTriggered = candleHigh >= takeProfit;
            if (stopTriggered && takeTriggered) {
                return {
                    status: "LOSS",
                    exitPrice: stopLoss,
                    resultR: -1,
                    exitReason: "STOP_LOSS",
                };
            }
            if (stopTriggered) {
                return {
                    status: "LOSS",
                    exitPrice: stopLoss,
                    resultR: -1,
                    exitReason: "STOP_LOSS",
                };
            }
            if (takeTriggered) {
                return {
                    status: "WIN",
                    exitPrice: takeProfit,
                    resultR: position.riskReward ?? 1,
                    exitReason: "TAKE_PROFIT",
                };
            }
        }
        return { status: "OPEN", exitPrice: null, resultR: null, exitReason: null };
    }
    async openPosition(symbol, timeframe, experimental = false) {
        if (!experimental &&
            this.configService.get("DEMO_TRADING_ENABLED", "false") !== "true") {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                reason: "Demo position blocked: DEMO_TRADING_ENABLED is not true.",
                position: null,
            };
        }
        const activeStrategy = this.configService.get("ACTIVE_STRATEGY_VERSION", "");
        const approvedStrategy = this.configService.get("APPROVED_STRATEGY_VERSION", "");
        if (!experimental &&
            (!approvedStrategy || approvedStrategy !== activeStrategy)) {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                reason: "Demo position blocked: the selected strategy is not explicitly approved.",
                position: null,
            };
        }
        if (!experimental) {
            const readiness = await this.backtestingService.getReadiness(symbol, timeframe);
            if (!readiness.isReady) {
                return {
                    symbol,
                    timeframe,
                    action: "NO_TRADE",
                    reason: `Demo position blocked: ${readiness.reason}`,
                    position: null,
                };
            }
        }
        const maxOpenPositions = experimental ? 1 : this.getMaxOpenPositions();
        const openPositions = await this.getOpenPositions();
        if (openPositions.length >= maxOpenPositions) {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                reason: `Demo position blocked: portfolio exposure limit (${maxOpenPositions} open Spot position).`,
                position: null,
            };
        }
        const signal = await this.signalsService.getLiveV2Signal(symbol, timeframe);
        if (!(0, spot_trading_policy_1.isAllowedSpotEntry)(signal.action)) {
            return {
                symbol,
                timeframe,
                action: signal.action,
                reason: signal.reason,
                position: null,
            };
        }
        const existingOpenPosition = await this.demoPositionRepository.findOne({
            where: {
                symbol,
                timeframe,
                status: "OPEN",
            },
        });
        if (existingOpenPosition) {
            return {
                symbol,
                timeframe,
                action: signal.action,
                signal,
                reason: "Duplicate open demo position prevented for this symbol/timeframe.",
                position: existingOpenPosition,
            };
        }
        if (signal.stopLoss === null || signal.takeProfit === null) {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                reason: "Actionable signal is missing risk levels.",
                position: null,
            };
        }
        const entryCandleTime = new Date(signal.candleTime.getTime() + this.getTimeframeDurationMs(timeframe));
        const entry = await this.marketDataService.getLiveCandleOpen(symbol, timeframe, entryCandleTime);
        if (entry === null) {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                reason: "The next candle open is not available for a forward Demo entry.",
                position: null,
            };
        }
        if (!Number.isFinite(entry) ||
            entry <= signal.stopLoss ||
            entry >= signal.takeProfit) {
            return {
                symbol,
                timeframe,
                action: "NO_TRADE",
                reason: "The next candle opened outside the signal risk levels.",
                position: null,
            };
        }
        const risk = Math.abs(entry - signal.stopLoss);
        const reward = Math.abs(signal.takeProfit - entry);
        const newPosition = this.demoPositionRepository.create({
            symbol,
            strategyVersion: activeStrategy || null,
            mode: experimental ? "EXPERIMENTAL" : "APPROVED",
            timeframe,
            side: signal.action,
            entry,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            riskReward: risk > 0 ? reward / risk : null,
            status: "OPEN",
            openedAt: entryCandleTime,
            closedAt: null,
            exitPrice: null,
            resultR: null,
            exitReason: null,
        });
        let savedPosition;
        try {
            savedPosition = await this.demoPositionRepository.save(newPosition);
        }
        catch (error) {
            if (!this.isDuplicateSignalError(error)) {
                throw error;
            }
            const duplicate = await this.demoPositionRepository.findOne({
                where: {
                    symbol,
                    timeframe,
                    strategyVersion: activeStrategy || null,
                    openedAt: entryCandleTime,
                },
            });
            if (!duplicate) {
                throw error;
            }
            return {
                symbol,
                timeframe,
                action: signal.action,
                signal,
                reason: "Duplicate Demo signal prevented by the database constraint.",
                position: duplicate,
            };
        }
        return {
            symbol,
            timeframe,
            action: signal.action,
            signal,
            reason: experimental
                ? "Experimental Demo position opened from the current live signal."
                : "Approved Demo position opened from the current live signal.",
            position: savedPosition,
        };
    }
    async getOpenPositions() {
        return this.demoPositionRepository.find({
            where: { status: "OPEN" },
            order: { openedAt: "DESC" },
        });
    }
    async getHistory() {
        return this.demoPositionRepository.find({
            where: { status: (0, typeorm_2.In)(["WIN", "LOSS"]) },
            order: { closedAt: "DESC" },
        });
    }
    async getSummary() {
        const history = await this.getHistory();
        const winningTrades = history.filter((position) => position.status === "WIN");
        const losingTrades = history.filter((position) => position.status === "LOSS");
        const totalR = history.reduce((sum, position) => sum + Number(position.resultR ?? 0), 0);
        return {
            openPositions: (await this.getOpenPositions()).length,
            completedTrades: history.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: history.length === 0
                ? 0
                : (winningTrades.length / history.length) * 100,
            totalR,
            expectancyR: history.length === 0 ? 0 : totalR / history.length,
        };
    }
    isDuplicateSignalError(error) {
        if (!(error instanceof typeorm_2.QueryFailedError)) {
            return false;
        }
        return error.driverError.code === "23505";
    }
    async checkOpenPositions() {
        const openPositions = await this.getOpenPositions();
        const processed = [];
        for (const position of openPositions) {
            const completedCandles = await this.getCompletedCandlesAfterOpen(position.symbol, position.timeframe, position.openedAt);
            if (completedCandles.length === 0) {
                processed.push({
                    symbol: position.symbol,
                    timeframe: position.timeframe,
                    side: position.side,
                    mode: position.mode,
                    entry: Number(position.entry),
                    stopLoss: Number(position.stopLoss),
                    takeProfit: Number(position.takeProfit),
                    status: "OPEN",
                    exitPrice: null,
                    closedAt: null,
                    resultR: null,
                    exitReason: null,
                    reason: "No completed candle is available after the position opening time.",
                });
                continue;
            }
            let outcome = {
                status: "OPEN",
                exitPrice: null,
                resultR: null,
                exitReason: null,
            };
            let exitCandle = null;
            const maxHoldingCandles = this.getMaxHoldingCandles(position.strategyVersion);
            for (const [index, candle] of completedCandles.entries()) {
                outcome = this.resolvePositionOutcome(position, candle);
                if (outcome.status !== "OPEN") {
                    exitCandle = candle;
                    break;
                }
                if (index + 1 >= maxHoldingCandles) {
                    const exitPrice = Number(candle.close);
                    const entry = Number(position.entry);
                    const risk = Math.abs(entry - Number(position.stopLoss));
                    const resultR = risk > 0 ? (exitPrice - entry) / risk : 0;
                    outcome = {
                        status: resultR >= 0 ? "WIN" : "LOSS",
                        exitPrice,
                        resultR,
                        exitReason: "TIME_EXIT",
                    };
                    exitCandle = candle;
                    break;
                }
            }
            if (outcome.status === "OPEN") {
                processed.push({
                    symbol: position.symbol,
                    timeframe: position.timeframe,
                    side: position.side,
                    mode: position.mode,
                    entry: Number(position.entry),
                    stopLoss: Number(position.stopLoss),
                    takeProfit: Number(position.takeProfit),
                    status: "OPEN",
                    exitPrice: null,
                    closedAt: null,
                    resultR: null,
                    exitReason: null,
                    reason: "No SL or TP threshold was reached in completed candles after the position opened.",
                });
                continue;
            }
            position.status = outcome.status;
            position.exitPrice = outcome.exitPrice;
            position.closedAt = new Date(exitCandle.time);
            position.resultR = outcome.resultR;
            position.exitReason = outcome.exitReason;
            await this.demoPositionRepository.save(position);
            processed.push({
                symbol: position.symbol,
                timeframe: position.timeframe,
                side: position.side,
                mode: position.mode,
                entry: Number(position.entry),
                stopLoss: Number(position.stopLoss),
                takeProfit: Number(position.takeProfit),
                status: outcome.status,
                exitPrice: outcome.exitPrice,
                closedAt: position.closedAt,
                resultR: outcome.resultR,
                exitReason: outcome.exitReason,
                reason: outcome.exitReason === "TAKE_PROFIT"
                    ? "Take profit threshold was reached."
                    : outcome.exitReason === "STOP_LOSS"
                        ? "Stop loss threshold was reached."
                        : "Maximum holding time was reached.",
            });
        }
        return {
            checkedAt: new Date(),
            processed,
        };
    }
    async getCompletedCandlesAfterOpen(symbol, timeframe, openedAt) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const durationMs = this.getTimeframeDurationMs(timeframe);
        return candles
            .filter((candle) => candle.time.getTime() + durationMs < Date.now())
            .filter((candle) => candle.time.getTime() > openedAt.getTime());
    }
    getTimeframeDurationMs(timeframe) {
        switch (timeframe) {
            case timeframe_enum_1.Timeframe.FIFTEEN_MINUTES:
                return 15 * 60 * 1000;
            case timeframe_enum_1.Timeframe.ONE_HOUR:
                return 60 * 60 * 1000;
            case timeframe_enum_1.Timeframe.FOUR_HOURS:
                return 4 * 60 * 60 * 1000;
            case timeframe_enum_1.Timeframe.ONE_DAY:
                return 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }
    getMaxOpenPositions() {
        const configured = Number(this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1));
        return Number.isInteger(configured) && configured > 0 ? configured : 1;
    }
    getMaxHoldingCandles(strategyVersion) {
        if (!strategyVersion)
            return 48;
        try {
            return this.strategyRegistry.get(strategyVersion).maxHoldingCandles;
        }
        catch {
            return 48;
        }
    }
};
exports.DemoTradingService = DemoTradingService;
exports.DemoTradingService = DemoTradingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(demo_position_entity_1.DemoPosition)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        signals_service_1.SignalsService,
        market_data_service_1.MarketDataService,
        backtesting_service_1.BacktestingService,
        strategy_registry_service_1.StrategyRegistryService,
        config_1.ConfigService])
], DemoTradingService);
//# sourceMappingURL=demo-trading.service.js.map