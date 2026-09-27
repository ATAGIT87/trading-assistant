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
exports.SignalsService = void 0;
const common_1 = require("@nestjs/common");
const timeframe_utils_1 = require("../assets/timeframe.utils");
const market_data_token_1 = require("./market-data.token");
const strategy_registry_service_1 = require("./strategy-registry.service");
const spot_trading_policy_1 = require("../trading/spot-trading-policy");
let SignalsService = class SignalsService {
    marketDataService;
    strategyRegistry;
    constructor(marketDataService, strategyRegistry) {
        this.marketDataService = marketDataService;
        this.strategyRegistry = strategyRegistry;
    }
    async generateSignalV2(symbol, timeframe, _period, higherTimeframeTrend) {
        const strategy = this.strategyRegistry.getActive();
        if (!strategy) {
            return null;
        }
        if (!strategy.supportedTimeframes.includes(timeframe)) {
            return null;
        }
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        return (0, spot_trading_policy_1.enforceSpotEntryPolicy)(strategy.evaluateCandles(candles, 0, candles.length, higherTimeframeTrend, symbol));
    }
    async getLiveV2Signal(symbol, timeframe) {
        const strategy = this.strategyRegistry.getActive();
        if (!strategy) {
            return this.noTradeSignal("No strategy is active: the previous research candidate was rejected and Demo remains disabled.");
        }
        if (!strategy.supportedTimeframes.includes(timeframe)) {
            return this.noTradeSignal(`Strategy ${strategy.version} is not defined for ${timeframe}.`);
        }
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const completedCandles = this.getCompletedCandles(candles, timeframe);
        if (completedCandles.length === 0) {
            return this.noTradeSignal("No completed candles are available at request time.");
        }
        const higherTimeframeTrend = strategy.requiresHigherTimeframeConfirmation
            ? await this.getHigherTimeframeTrend(symbol, timeframe)
            : undefined;
        const signal = strategy.evaluateCandles(completedCandles, 0, completedCandles.length, higherTimeframeTrend, symbol);
        return (0, spot_trading_policy_1.enforceSpotEntryPolicy)(signal);
    }
    getCompletedCandles(candles, timeframe, now = new Date()) {
        return candles.filter((candle) => candle.time.getTime() + timeframe_utils_1.timeframeDurationMs[timeframe] <= now.getTime());
    }
    async getHigherTimeframeTrend(symbol, timeframe) {
        const higherTimeframe = (0, timeframe_utils_1.getHigherTimeframe)(timeframe);
        if (higherTimeframe === null) {
            return undefined;
        }
        const higherTimeframeCandles = this.getCompletedCandles(await this.marketDataService.getHistoricalCandles(symbol, higherTimeframe), higherTimeframe);
        const strategy = this.strategyRegistry.getActive();
        return strategy?.getTrend(higherTimeframeCandles) ?? "NEUTRAL";
    }
    noTradeSignal(reason) {
        return {
            action: "NO_TRADE",
            confidence: 0,
            entryPrice: 0,
            stopLoss: null,
            takeProfit: null,
            isStrongSetup: false,
            trend: "NEUTRAL",
            rsi: 50,
            adx: 0,
            rsiStatus: "NEUTRAL",
            marketCondition: "NEUTRAL",
            candleTime: new Date(),
            reason,
        };
    }
};
exports.SignalsService = SignalsService;
exports.SignalsService = SignalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(market_data_token_1.MARKET_DATA_SERVICE)),
    __metadata("design:paramtypes", [Object, strategy_registry_service_1.StrategyRegistryService])
], SignalsService);
//# sourceMappingURL=signals.service.js.map