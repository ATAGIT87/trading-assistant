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
exports.MarketDataAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const indicators_service_1 = require("../indicators/indicators.service");
let MarketDataAnalysisService = class MarketDataAnalysisService {
    indicatorsService;
    constructor(indicatorsService) {
        this.indicatorsService = indicatorsService;
    }
    getLatestRsi(candles) {
        return this.indicatorsService.calculateRsiFromCandles(candles, 14);
    }
    getLatestSma(candles, period) {
        return this.indicatorsService.calculateSmaFromCandles(candles, period);
    }
    getLatestEma(candles, period) {
        return this.indicatorsService.calculateEma(candles.map((candle) => Number(candle.close)), period);
    }
    comparePriceToSma(price, sma) {
        return this.indicatorsService.comparePriceToAverage(price, sma);
    }
    comparePriceToEma(price, ema) {
        return this.indicatorsService.comparePriceToAverage(price, ema);
    }
    compareSmaToEma(sma, ema) {
        return this.indicatorsService.compareSmaToEma(sma, ema);
    }
    determineTrend(price, sma, ema) {
        const priceVsSma = this.indicatorsService.comparePriceToAverage(price, sma);
        const priceVsEma = this.indicatorsService.comparePriceToAverage(price, ema);
        return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
    }
    classifyRsi(rsi) {
        return this.indicatorsService.classifyRsi(rsi);
    }
    determineMarketCondition(trend, rsiStatus) {
        return this.indicatorsService.determineMarketCondition(trend, rsiStatus);
    }
    calculateAtr(candles, period) {
        if (candles.length < period + 1) {
            return null;
        }
        const trueRanges = this.indicatorsService.calculateTrueRangesFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        })));
        return this.indicatorsService.calculateAtr(trueRanges, period);
    }
    calculateAdx(candles, period) {
        return this.indicatorsService.calculateAdxFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        })), period);
    }
};
exports.MarketDataAnalysisService = MarketDataAnalysisService;
exports.MarketDataAnalysisService = MarketDataAnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [indicators_service_1.IndicatorsService])
], MarketDataAnalysisService);
//# sourceMappingURL=market-data-analysis.service.js.map