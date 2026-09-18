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
exports.SignalTimeframeService = void 0;
const common_1 = require("@nestjs/common");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const indicators_service_1 = require("../indicators/indicators.service");
const market_data_token_1 = require("./market-data.token");
let SignalTimeframeService = class SignalTimeframeService {
    marketDataService;
    indicatorsService;
    constructor(marketDataService, indicatorsService) {
        this.marketDataService = marketDataService;
        this.indicatorsService = indicatorsService;
    }
    async getHigherTimeframeTrend(symbol, timeframe, period) {
        const higherTimeframe = this.getHigherTimeframe(timeframe);
        if (higherTimeframe === null) {
            return null;
        }
        return this.marketDataService.getTrend(symbol, higherTimeframe, period);
    }
    async getHigherTimeframeTrendFromCandles(symbol, timeframe, until) {
        const higherTimeframe = this.getHigherTimeframe(timeframe);
        if (higherTimeframe === null) {
            return null;
        }
        const candles = await this.marketDataService.getHistoricalCandlesUntil(symbol, higherTimeframe, until);
        if (candles.length < 28) {
            return null;
        }
        const latestClose = Number(candles[candles.length - 1].close);
        const closes = candles.map((candle) => Number(candle.close));
        const sma = this.indicatorsService.calculateSma(closes, 14);
        const ema = this.indicatorsService.calculateEma(closes, 14);
        if (sma === null || ema === null) {
            return null;
        }
        const priceVsSma = this.indicatorsService.comparePriceToAverage(latestClose, sma);
        const priceVsEma = this.indicatorsService.comparePriceToAverage(latestClose, ema);
        return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
    }
    getHigherTimeframe(timeframe) {
        if (timeframe === timeframe_enum_1.Timeframe.FIFTEEN_MINUTES) {
            return timeframe_enum_1.Timeframe.ONE_HOUR;
        }
        if (timeframe === timeframe_enum_1.Timeframe.ONE_HOUR) {
            return timeframe_enum_1.Timeframe.FOUR_HOURS;
        }
        if (timeframe === timeframe_enum_1.Timeframe.FOUR_HOURS) {
            return timeframe_enum_1.Timeframe.ONE_DAY;
        }
        return null;
    }
};
exports.SignalTimeframeService = SignalTimeframeService;
exports.SignalTimeframeService = SignalTimeframeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(market_data_token_1.MARKET_DATA_SERVICE)),
    __metadata("design:paramtypes", [Object, indicators_service_1.IndicatorsService])
], SignalTimeframeService);
//# sourceMappingURL=signal-timeframe.service.js.map