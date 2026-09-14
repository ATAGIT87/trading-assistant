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
exports.SignalsService = void 0;
const common_1 = require("@nestjs/common");
const market_data_service_1 = require("../market-data/market-data.service");
const indicators_service_1 = require("../indicators/indicators.service");
let SignalsService = class SignalsService {
    marketDataService;
    indicatorsService;
    constructor(marketDataService, indicatorsService) {
        this.marketDataService = marketDataService;
        this.indicatorsService = indicatorsService;
    }
    determineAction(marketCondition) {
        if (marketCondition === "BULLISH_CONTINUATION") {
            return "BUY";
        }
        if (marketCondition === "BEARISH_CONTINUATION") {
            return "SELL";
        }
        return "WAIT";
    }
    createSignal(trend, priceVsSma, priceVsEma, rsi, rsiStatus, marketCondition) {
        const action = this.determineAction(marketCondition);
        const trendScore = this.indicatorsService.calculateTrendScore(trend);
        const averageAlignmentScore = this.indicatorsService.calculateAverageAlignmentScore(priceVsSma, priceVsEma);
        const rsiScore = this.indicatorsService.calculateRsiScore(rsiStatus);
        const confidence = this.calculateConfidence(trendScore, averageAlignmentScore, rsiScore);
        return {
            action,
            confidence,
            trend,
            rsi,
            rsiStatus,
            marketCondition,
            reason: `Trend is ${trend} and RSI status is ${rsiStatus}.`,
        };
    }
    async generateSignal(symbol, timeframe, period) {
        const trend = await this.marketDataService.getTrend(symbol, timeframe, period);
        const priceVsSma = await this.marketDataService.compareLatestPriceToSma(symbol, timeframe, period);
        const priceVsEma = await this.marketDataService.compareLatestPriceToEma(symbol, timeframe, period);
        const rsi = await this.marketDataService.getLatestRsi(symbol, timeframe);
        const rsiStatus = await this.marketDataService.getRsiStatus(symbol, timeframe, period);
        const marketCondition = await this.marketDataService.getMarketCondition(symbol, timeframe, period);
        if (trend === null ||
            priceVsSma === null ||
            priceVsEma === null ||
            rsi === null ||
            rsiStatus === null ||
            marketCondition === null) {
            return null;
        }
        return this.createSignal(trend, priceVsSma, priceVsEma, rsi, rsiStatus, marketCondition);
    }
    calculateConfidence(trendScore, averageAlignmentScore, rsiScore) {
        return trendScore + averageAlignmentScore + rsiScore;
    }
};
exports.SignalsService = SignalsService;
exports.SignalsService = SignalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService,
        indicators_service_1.IndicatorsService])
], SignalsService);
//# sourceMappingURL=signals.service.js.map