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
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const indicators_service_1 = require("../indicators/indicators.service");
const common_1 = require("@nestjs/common");
const market_data_token_1 = require("./market-data.token");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const signal_entity_1 = require("./entities/signal.entity");
const STRONG_SETUP_THRESHOLD = 75;
let SignalsService = class SignalsService {
    marketDataService;
    indicatorsService;
    signalRepository;
    constructor(marketDataService, indicatorsService, signalRepository) {
        this.marketDataService = marketDataService;
        this.indicatorsService = indicatorsService;
        this.signalRepository = signalRepository;
    }
    determineAction(higherTimeframeTrend, trend, marketCondition, isStrongSetup, adx, atr) {
        if (!isStrongSetup) {
            return "NO_TRADE";
        }
        if (trend === "NEUTRAL") {
            return "NO_TRADE";
        }
        if (adx < 25) {
            return "NO_TRADE";
        }
        if (atr <= 0) {
            return "NO_TRADE";
        }
        if (higherTimeframeTrend !== null &&
            ((trend === "BULLISH" && higherTimeframeTrend !== "BULLISH") ||
                (trend === "BEARISH" && higherTimeframeTrend !== "BEARISH"))) {
            return "NO_TRADE";
        }
        if ((trend === "BULLISH" && marketCondition === "BEARISH_CONTINUATION") ||
            (trend === "BEARISH" && marketCondition === "BULLISH_CONTINUATION")) {
            return "NO_TRADE";
        }
        if (marketCondition === "BULLISH_CONTINUATION") {
            return "BUY";
        }
        if (marketCondition === "BEARISH_CONTINUATION") {
            return "SELL";
        }
        return "WAIT";
    }
    createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition, higherTimeframeTrend, candleTime) {
        const trendScore = this.indicatorsService.calculateTrendScore(trend);
        const averageAlignmentScore = this.indicatorsService.calculateAverageAlignmentScore(priceVsSma, priceVsEma);
        const rsiScore = this.indicatorsService.calculateRsiScore(trend, rsi);
        const marketConditionScore = this.indicatorsService.calculateMarketConditionScore(trend, marketCondition);
        const adxScore = this.indicatorsService.calculateAdxScore(adx);
        const confidence = this.calculateConfidence(trendScore, averageAlignmentScore, rsiScore, marketConditionScore, adxScore);
        const isStrongSetup = confidence >= STRONG_SETUP_THRESHOLD;
        const action = this.determineAction(higherTimeframeTrend, trend, marketCondition, isStrongSetup, adx, atr);
        let stopLoss = null;
        let takeProfit = null;
        if (action === "BUY" || action === "SELL") {
            stopLoss = this.calculateStopLoss(action, entryPrice, atr);
            takeProfit = this.calculateTakeProfit(action, entryPrice, stopLoss, 2);
        }
        return {
            action,
            confidence,
            entryPrice,
            stopLoss,
            takeProfit,
            isStrongSetup,
            trend,
            rsi,
            adx,
            rsiStatus,
            marketCondition,
            candleTime,
            reason: action === "BUY"
                ? `Bullish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
                : action === "SELL"
                    ? `Bearish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
                    : `No valid trading setup. Trend: ${trend}, Higher timeframe trend: ${higherTimeframeTrend ?? "N/A"}, RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`,
        };
    }
    async generateSignal(symbol, timeframe, period) {
        const trend = await this.marketDataService.getTrend(symbol, timeframe, period);
        const higherTimeframeTrend = await this.getHigherTimeframeTrend(symbol, timeframe, period);
        const priceVsSma = await this.marketDataService.compareLatestPriceToSma(symbol, timeframe, period);
        const priceVsEma = await this.marketDataService.compareLatestPriceToEma(symbol, timeframe, period);
        const rsi = await this.marketDataService.getLatestRsi(symbol, timeframe);
        const rsiStatus = await this.marketDataService.getRsiStatus(symbol, timeframe, period);
        const marketCondition = await this.marketDataService.getMarketCondition(symbol, timeframe, period);
        const entryPrice = await this.marketDataService.getLatestPrice(symbol, timeframe);
        const atr = await this.marketDataService.getLatestAtr(symbol, timeframe, period);
        const adx = await this.marketDataService.getLatestAdx(symbol, timeframe, period);
        const candles = await this.marketDataService.getHistoricalCandles(symbol, timeframe);
        if (candles.length === 0) {
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        if (trend === null ||
            priceVsSma === null ||
            priceVsEma === null ||
            rsi === null ||
            rsiStatus === null ||
            marketCondition === null ||
            entryPrice === null ||
            atr === null ||
            adx === null) {
            return null;
        }
        const signal = this.createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition, higherTimeframeTrend, latestCandle.time);
        const existingSignal = await this.getSignalByCandleTime(symbol, timeframe, latestCandle.time);
        if (!existingSignal) {
            await this.saveSignal(symbol, timeframe, signal);
        }
        return signal;
    }
    calculateConfidence(trendScore, averageAlignmentScore, rsiScore, marketConditionScore, adxScore) {
        return Math.min(trendScore +
            averageAlignmentScore +
            rsiScore +
            marketConditionScore +
            adxScore, 100);
    }
    calculateStopLoss(action, entryPrice, atr) {
        const stopDistance = 1.5 * atr;
        if (action === "BUY") {
            return entryPrice - stopDistance;
        }
        return entryPrice + stopDistance;
    }
    calculateTakeProfit(action, entryPrice, stopLoss, riskRewardRatio) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = risk * riskRewardRatio;
        if (action === "BUY") {
            return entryPrice + reward;
        }
        return entryPrice - reward;
    }
    async getHigherTimeframeTrend(symbol, timeframe, period) {
        const higherTimeframe = timeframe === timeframe_enum_1.Timeframe.FIFTEEN_MINUTES
            ? timeframe_enum_1.Timeframe.ONE_HOUR
            : timeframe === timeframe_enum_1.Timeframe.ONE_HOUR
                ? timeframe_enum_1.Timeframe.FOUR_HOURS
                : timeframe === timeframe_enum_1.Timeframe.FOUR_HOURS
                    ? timeframe_enum_1.Timeframe.ONE_DAY
                    : null;
        if (higherTimeframe === null) {
            return null;
        }
        return this.marketDataService.getTrend(symbol, higherTimeframe, period);
    }
    async getHigherTimeframeTrendFromCandles(symbol, timeframe, until) {
        let higherTimeframe = null;
        if (timeframe === timeframe_enum_1.Timeframe.FIFTEEN_MINUTES) {
            higherTimeframe = timeframe_enum_1.Timeframe.ONE_HOUR;
        }
        else if (timeframe === timeframe_enum_1.Timeframe.ONE_HOUR) {
            higherTimeframe = timeframe_enum_1.Timeframe.FOUR_HOURS;
        }
        else if (timeframe === timeframe_enum_1.Timeframe.FOUR_HOURS) {
            higherTimeframe = timeframe_enum_1.Timeframe.ONE_DAY;
        }
        if (higherTimeframe === null) {
            return null;
        }
        const higherTimeframeCandles = await this.marketDataService.getHistoricalCandlesUntil(symbol, higherTimeframe, until);
        if (higherTimeframeCandles.length < 28) {
            return null;
        }
        const latestClose = Number(higherTimeframeCandles[higherTimeframeCandles.length - 1].close);
        const closes = higherTimeframeCandles.map((candle) => Number(candle.close));
        const sma = this.indicatorsService.calculateSma(closes, 14);
        const ema = this.indicatorsService.calculateEma(closes, 14);
        if (sma === null || ema === null) {
            return null;
        }
        const priceVsSma = this.indicatorsService.comparePriceToAverage(latestClose, sma);
        const priceVsEma = this.indicatorsService.comparePriceToAverage(latestClose, ema);
        return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
    }
    async generateSignalFromCandles(symbol, timeframe, candles) {
        const indicators = this.indicatorsService.calculateIndicatorsFromCandles(candles, 14);
        if (indicators === null) {
            return null;
        }
        const latestCandle = candles[candles.length - 1];
        const entryPrice = Number(latestCandle.close);
        const higherTimeframeTrend = await this.getHigherTimeframeTrendFromCandles(symbol, timeframe, latestCandle.time);
        const { trend, priceVsSma, priceVsEma, rsi, rsiStatus, marketCondition, atr, adx, } = indicators;
        return this.createSignal(trend, entryPrice, atr, priceVsSma, priceVsEma, rsi, adx, rsiStatus, marketCondition, higherTimeframeTrend, latestCandle.time);
    }
    async saveSignal(symbol, timeframe, signal) {
        const entity = this.signalRepository.create({
            symbol,
            timeframe,
            action: signal.action,
            confidence: signal.confidence,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            trend: signal.trend,
            rsi: signal.rsi,
            adx: signal.adx,
            marketCondition: signal.marketCondition,
            isStrongSetup: signal.isStrongSetup,
            reason: signal.reason,
            candleTime: signal.candleTime,
        });
        return this.signalRepository.save(entity);
    }
    async getSignalHistory(symbol, timeframe) {
        return this.signalRepository.find({
            where: {
                symbol,
                timeframe,
            },
            order: {
                createdAt: "DESC",
            },
            take: 50,
        });
    }
    async getLatestSignal(symbol, timeframe) {
        return this.signalRepository.findOne({
            where: {
                symbol,
                timeframe,
            },
            order: {
                createdAt: "DESC",
            },
        });
    }
    async getSignalByCandleTime(symbol, timeframe, candleTime) {
        return this.signalRepository.findOne({
            where: {
                symbol,
                timeframe,
                candleTime,
            },
        });
    }
};
exports.SignalsService = SignalsService;
exports.SignalsService = SignalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(market_data_token_1.MARKET_DATA_SERVICE)),
    __param(2, (0, typeorm_1.InjectRepository)(signal_entity_1.Signal)),
    __metadata("design:paramtypes", [Object, indicators_service_1.IndicatorsService,
        typeorm_2.Repository])
], SignalsService);
//# sourceMappingURL=signals.service.js.map