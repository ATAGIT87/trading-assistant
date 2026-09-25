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
const strategy_v2_service_1 = require("./strategy-v2.service");
let SignalsService = class SignalsService {
    marketDataService;
    strategyV2Service;
    constructor(marketDataService, strategyV2Service) {
        this.marketDataService = marketDataService;
        this.strategyV2Service = strategyV2Service;
    }
    async generateSignalV2(symbol, timeframe, _period, higherTimeframeTrend) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        return this.strategyV2Service.evaluateCandles(candles, 0, candles.length, higherTimeframeTrend);
    }
    async getLiveV2Signal(symbol, timeframe) {
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        const completedCandles = this.getCompletedCandles(candles, timeframe);
        if (completedCandles.length === 0) {
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
                reason: "No completed candles are available at request time.",
            };
        }
        const signal = this.strategyV2Service.evaluateCandles(completedCandles, 0, completedCandles.length, await this.getHigherTimeframeTrend(symbol, timeframe));
        return signal;
    }
    getCompletedCandles(candles, timeframe, now = new Date()) {
        return candles.filter((candle) => candle.time.getTime() +
            timeframe_utils_1.timeframeDurationMs[timeframe] <=
            now.getTime());
    }
    async getHigherTimeframeTrend(symbol, timeframe) {
        const higherTimeframe = (0, timeframe_utils_1.getHigherTimeframe)(timeframe);
        if (higherTimeframe === null) {
            return undefined;
        }
        const higherTimeframeCandles = this.getCompletedCandles(await this.marketDataService.getHistoricalCandles(symbol, higherTimeframe), higherTimeframe);
        return this.strategyV2Service.getTrend(higherTimeframeCandles) ?? "NEUTRAL";
    }
};
exports.SignalsService = SignalsService;
exports.SignalsService = SignalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(market_data_token_1.MARKET_DATA_SERVICE)),
    __metadata("design:paramtypes", [Object, strategy_v2_service_1.StrategyV2Service])
], SignalsService);
//# sourceMappingURL=signals.service.js.map