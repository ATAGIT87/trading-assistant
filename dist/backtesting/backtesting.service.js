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
let BacktestingService = class BacktestingService {
    marketDataService;
    signalsService;
    constructor(marketDataService, signalsService) {
        this.marketDataService = marketDataService;
        this.signalsService = signalsService;
    }
    isTradeWinner(signal, futureCandles) {
        if (signal.stopLoss === null || signal.takeProfit === null) {
            return null;
        }
        for (const candle of futureCandles) {
            const high = Number(candle.high);
            const low = Number(candle.low);
            if (signal.action === "BUY") {
                if (low <= signal.stopLoss) {
                    return false;
                }
                if (high >= signal.takeProfit) {
                    return true;
                }
            }
            if (signal.action === "SELL") {
                if (high >= signal.stopLoss) {
                    return false;
                }
                if (low <= signal.takeProfit) {
                    return true;
                }
            }
        }
        return null;
    }
    async run(symbol, timeframe) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        console.log("CANDLES:", candles.length);
        let totalTrades = 0;
        let winningTrades = 0;
        let losingTrades = 0;
        const period = 14;
        let i = period * 2 - 1;
        while (i < candles.length) {
            const historicalCandles = await this.marketDataService.getHistoricalCandlesUntil(symbol, timeframe, candles[i].time);
            if (historicalCandles.length === 0 ||
                historicalCandles[historicalCandles.length - 1].time.getTime() !==
                    candles[i].time.getTime()) {
                throw new Error(`Look-ahead detected at ${candles[i].time.toISOString()}`);
            }
            const signal = await this.signalsService.generateSignalFromCandles(symbol, timeframe, historicalCandles);
            console.log(candles[i].time, signal?.action, signal?.confidence, signal?.trend, signal?.rsi, signal?.adx, signal?.marketCondition);
            if (signal?.action !== "BUY" && signal?.action !== "SELL") {
                i++;
                continue;
            }
            totalTrades++;
            const futureCandles = candles.slice(i + 1);
            const trade = this.findTradeOutcome(signal, futureCandles);
            console.log("TRADE:", candles[i].time, signal.action, "Entry:", signal.entryPrice, "SL:", signal.stopLoss, "TP:", signal.takeProfit, "Result:", trade.result);
            if (trade.result === true) {
                winningTrades++;
            }
            if (trade.result === false) {
                losingTrades++;
            }
            if (trade.exitIndex === null) {
                break;
            }
            i = i + trade.exitIndex + 2;
        }
        const completedTrades = winningTrades + losingTrades;
        return {
            totalTrades,
            winningTrades,
            losingTrades,
            winRate: completedTrades === 0 ? 0 : (winningTrades / completedTrades) * 100,
        };
    }
    findTradeOutcome(signal, futureCandles) {
        if (signal.stopLoss === null || signal.takeProfit === null) {
            return {
                result: null,
                exitIndex: null,
            };
        }
        for (let i = 0; i < futureCandles.length; i++) {
            const candle = futureCandles[i];
            const high = Number(candle.high);
            const low = Number(candle.low);
            if (signal.action === "BUY") {
                const hitStopLoss = low <= signal.stopLoss;
                const hitTakeProfit = high >= signal.takeProfit;
                if (hitStopLoss && hitTakeProfit) {
                    return {
                        result: false,
                        exitIndex: i,
                    };
                }
                if (hitStopLoss) {
                    return {
                        result: false,
                        exitIndex: i,
                    };
                }
                if (hitTakeProfit) {
                    return {
                        result: true,
                        exitIndex: i,
                    };
                }
            }
            if (signal.action === "SELL") {
                const hitStopLoss = high >= signal.stopLoss;
                const hitTakeProfit = low <= signal.takeProfit;
                if (hitStopLoss && hitTakeProfit) {
                    return {
                        result: false,
                        exitIndex: i,
                    };
                }
                if (hitStopLoss) {
                    return {
                        result: false,
                        exitIndex: i,
                    };
                }
                if (hitTakeProfit) {
                    return {
                        result: true,
                        exitIndex: i,
                    };
                }
            }
        }
        return {
            result: null,
            exitIndex: null,
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