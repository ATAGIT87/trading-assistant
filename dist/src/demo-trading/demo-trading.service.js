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
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const market_data_service_1 = require("../market-data/market-data.service");
const signals_service_1 = require("../signals/signals.service");
const demo_position_entity_1 = require("./entities/demo-position.entity");
let DemoTradingService = class DemoTradingService {
    demoPositionRepository;
    signalsService;
    marketDataService;
    constructor(demoPositionRepository, signalsService, marketDataService) {
        this.demoPositionRepository = demoPositionRepository;
        this.signalsService = signalsService;
        this.marketDataService = marketDataService;
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
                return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
            }
            if (stopTriggered) {
                return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
            }
            if (takeTriggered) {
                return {
                    status: "WIN",
                    exitPrice: takeProfit,
                    resultR: position.riskReward ?? 1,
                };
            }
        }
        if (position.side === "SELL") {
            const stopTriggered = candleHigh >= stopLoss;
            const takeTriggered = candleLow <= takeProfit;
            if (stopTriggered && takeTriggered) {
                return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
            }
            if (stopTriggered) {
                return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
            }
            if (takeTriggered) {
                return {
                    status: "WIN",
                    exitPrice: takeProfit,
                    resultR: position.riskReward ?? 1,
                };
            }
        }
        return { status: "OPEN", exitPrice: null, resultR: null };
    }
    async openPosition(symbol, timeframe) {
        const signal = await this.signalsService.getLiveV2Signal(symbol, timeframe);
        if (signal.action !== "BUY" &&
            signal.action !== "SELL") {
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
        const risk = Math.abs(signal.entryPrice - signal.stopLoss);
        const reward = Math.abs(signal.takeProfit - signal.entryPrice);
        const newPosition = this.demoPositionRepository.create({
            symbol,
            timeframe,
            side: signal.action,
            entry: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            riskReward: risk > 0 ? reward / risk : null,
            status: "OPEN",
            openedAt: new Date(signal.candleTime),
            closedAt: null,
            exitPrice: null,
            resultR: null,
        });
        const savedPosition = await this.demoPositionRepository.save(newPosition);
        return {
            symbol,
            timeframe,
            action: signal.action,
            signal,
            reason: "Demo position opened from the current live V2 signal.",
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
    async checkOpenPositions() {
        const openPositions = await this.getOpenPositions();
        const processed = [];
        for (const position of openPositions) {
            const latestCandle = await this.getLatestCompletedCandle(position.symbol, position.timeframe);
            if (!latestCandle) {
                processed.push({
                    symbol: position.symbol,
                    timeframe: position.timeframe,
                    side: position.side,
                    entry: Number(position.entry),
                    stopLoss: Number(position.stopLoss),
                    takeProfit: Number(position.takeProfit),
                    status: "OPEN",
                    exitPrice: null,
                    closedAt: null,
                    resultR: null,
                    reason: "No completed candle available yet.",
                });
                continue;
            }
            const outcome = this.resolvePositionOutcome(position, latestCandle);
            if (outcome.status === "OPEN") {
                processed.push({
                    symbol: position.symbol,
                    timeframe: position.timeframe,
                    side: position.side,
                    entry: Number(position.entry),
                    stopLoss: Number(position.stopLoss),
                    takeProfit: Number(position.takeProfit),
                    status: "OPEN",
                    exitPrice: null,
                    closedAt: null,
                    resultR: null,
                    reason: "No SL or TP threshold was reached in the latest completed candle.",
                });
                continue;
            }
            position.status = outcome.status;
            position.exitPrice = outcome.exitPrice;
            position.closedAt = new Date(latestCandle.time);
            position.resultR = outcome.resultR;
            await this.demoPositionRepository.save(position);
            processed.push({
                symbol: position.symbol,
                timeframe: position.timeframe,
                side: position.side,
                entry: Number(position.entry),
                stopLoss: Number(position.stopLoss),
                takeProfit: Number(position.takeProfit),
                status: outcome.status,
                exitPrice: outcome.exitPrice,
                closedAt: position.closedAt,
                resultR: outcome.resultR,
                reason: outcome.status === "WIN"
                    ? "Take profit threshold was reached."
                    : "Stop loss threshold was reached.",
            });
        }
        return {
            checkedAt: new Date(),
            processed,
        };
    }
    async getLatestCompletedCandle(symbol, timeframe) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const durationMs = this.getTimeframeDurationMs(timeframe);
        const completedCandles = candles.filter((candle) => candle.time.getTime() + durationMs < Date.now());
        if (completedCandles.length === 0) {
            return null;
        }
        return completedCandles[completedCandles.length - 1];
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
};
exports.DemoTradingService = DemoTradingService;
exports.DemoTradingService = DemoTradingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(demo_position_entity_1.DemoPosition)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        signals_service_1.SignalsService,
        market_data_service_1.MarketDataService])
], DemoTradingService);
//# sourceMappingURL=demo-trading.service.js.map