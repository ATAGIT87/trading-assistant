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
exports.MarketDataService = void 0;
const common_1 = require("@nestjs/common");
const market_candle_entity_1 = require("./entities/market-candle.entity");
const market_candle_storage_service_1 = require("./market-candle-storage.service");
const market_data_analysis_service_1 = require("./market-data-analysis.service");
const market_data_provider_service_1 = require("./market-data-provider.service");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const timeframe_utils_1 = require("../assets/timeframe.utils");
const market_data_quality_1 = require("./market-data-quality");
let MarketDataService = class MarketDataService {
    storageService;
    analysisService;
    marketDataProviderService;
    constructor(storageService, analysisService, marketDataProviderService) {
        this.storageService = storageService;
        this.analysisService = analysisService;
        this.marketDataProviderService = marketDataProviderService;
    }
    createCandle(dto) {
        return this.storageService.createCandle(dto);
    }
    findAllCandles() {
        return this.storageService.findAllCandles();
    }
    findCandlesBySymbol(symbol) {
        return this.storageService.findCandlesBySymbol(symbol);
    }
    findCandlesBySymbolAndTimeframe(symbol, timeframe) {
        return this.storageService.findCandlesBySymbolAndTimeframe(symbol, timeframe);
    }
    async findLatestCandle(symbol, timeframe) {
        return this.storageService.findLatestCandle(symbol, timeframe);
    }
    async getLatestPrice(symbol, timeframe) {
        const candle = await this.storageService.findLatestCandle(symbol, timeframe);
        if (!candle) {
            return null;
        }
        return Number(candle.close);
    }
    getCandlesForAnalysis(symbol, timeframe) {
        return this.storageService.getCandlesForAnalysis(symbol, timeframe);
    }
    async getLatestRsi(symbol, timeframe) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.analysisService.getLatestRsi(candles);
    }
    async getLatestSma(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.analysisService.getLatestSma(candles, period);
    }
    async getLatestEma(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.analysisService.getLatestEma(candles, period);
    }
    async compareLatestPriceToSma(symbol, timeframe, period) {
        const price = await this.getLatestPrice(symbol, timeframe);
        const sma = await this.getLatestSma(symbol, timeframe, period);
        if (price === null || sma === null) {
            return null;
        }
        return this.analysisService.comparePriceToSma(price, sma);
    }
    async compareLatestPriceToEma(symbol, timeframe, period) {
        const price = await this.getLatestPrice(symbol, timeframe);
        const ema = await this.getLatestEma(symbol, timeframe, period);
        if (price === null || ema === null) {
            return null;
        }
        return this.analysisService.comparePriceToEma(price, ema);
    }
    async compareSmaToEma(symbol, timeframe, period) {
        const sma = await this.getLatestSma(symbol, timeframe, period);
        const ema = await this.getLatestEma(symbol, timeframe, period);
        if (sma === null || ema === null) {
            return null;
        }
        return this.analysisService.compareSmaToEma(sma, ema);
    }
    async getTrend(symbol, timeframe, period) {
        const price = await this.getLatestPrice(symbol, timeframe);
        const sma = await this.getLatestSma(symbol, timeframe, period);
        const ema = await this.getLatestEma(symbol, timeframe, period);
        if (price === null || sma === null || ema === null) {
            return null;
        }
        return this.analysisService.determineTrend(price, sma, ema);
    }
    async getRsiStatus(symbol, timeframe, period) {
        const rsi = await this.getLatestRsi(symbol, timeframe);
        if (rsi === null) {
            return null;
        }
        return this.analysisService.classifyRsi(rsi);
    }
    async getMarketCondition(symbol, timeframe, period) {
        const trend = await this.getTrend(symbol, timeframe, period);
        const rsiStatus = await this.getRsiStatus(symbol, timeframe, period);
        if (trend === null || rsiStatus === null) {
            return null;
        }
        return this.analysisService.determineMarketCondition(trend, rsiStatus);
    }
    async getLatestAtr(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.analysisService.calculateAtr(candles, period);
    }
    async getLatestAdx(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.analysisService.calculateAdx(candles, period);
    }
    getHistoricalCandles(symbol, timeframe) {
        return this.storageService.getHistoricalCandles(symbol, timeframe);
    }
    async getDataQuality(symbol, timeframe) {
        return (0, market_data_quality_1.assessMarketDataQuality)(symbol, timeframe, await this.getHistoricalCandles(symbol, timeframe));
    }
    getHistoricalCandlesUntil(symbol, timeframe, until) {
        return this.storageService.getHistoricalCandlesUntil(symbol, timeframe, until);
    }
    async buildFourHourCandles(symbol) {
        const hourlyCandles = await this.storageService.getHistoricalCandles(symbol, timeframe_enum_1.Timeframe.ONE_HOUR);
        if (hourlyCandles.length === 0) {
            return 0;
        }
        const groups = new Map();
        for (const candle of hourlyCandles) {
            const time = new Date(candle.time);
            const alignedHour = Math.floor(time.getUTCHours() / 4) * 4;
            const startTime = new Date(time);
            startTime.setUTCHours(alignedHour, 0, 0, 0);
            const key = startTime.getTime();
            const group = groups.get(key) ?? [];
            group.push(candle);
            groups.set(key, group);
        }
        const fourHourCandles = [];
        for (const [startTime, candles] of groups) {
            candles.sort((a, b) => a.time.getTime() - b.time.getTime());
            if (candles.length !== 4) {
                continue;
            }
            const first = candles[0];
            const last = candles[candles.length - 1];
            const high = Math.max(...candles.map((candle) => Number(candle.high)));
            const low = Math.min(...candles.map((candle) => Number(candle.low)));
            const volume = candles.reduce((sum, candle) => sum + Number(candle.volume), 0);
            const fourHourCandle = new market_candle_entity_1.MarketCandle();
            fourHourCandle.symbol = symbol;
            fourHourCandle.timeframe = timeframe_enum_1.Timeframe.FOUR_HOURS;
            fourHourCandle.time = new Date(startTime);
            fourHourCandle.open = first.open;
            fourHourCandle.high = high.toString();
            fourHourCandle.low = low.toString();
            fourHourCandle.close = last.close;
            fourHourCandle.volume = volume.toString();
            fourHourCandles.push(fourHourCandle);
        }
        await this.storageService.replaceFourHourCandles(symbol, fourHourCandles);
        return fourHourCandles.length;
    }
    async repairBinanceGaps(symbol, timeframe) {
        const durationMs = timeframe_utils_1.timeframeDurationMs[timeframe];
        const candles = await this.getHistoricalCandles(symbol, timeframe);
        let gapsFound = 0;
        let received = 0;
        let saved = 0;
        for (let index = 1; index < candles.length; index++) {
            const previous = candles[index - 1];
            const next = candles[index];
            const missing = Math.round((next.time.getTime() - previous.time.getTime()) / durationMs) - 1;
            if (missing <= 0) {
                continue;
            }
            gapsFound++;
            const batch = await this.marketDataProviderService.getBinanceCandles(symbol, timeframe, Math.min(missing + 2, 1000), next.time.getTime() - 1);
            const missingCandles = batch.filter((candle) => candle.time.getTime() > previous.time.getTime() &&
                candle.time.getTime() < next.time.getTime() &&
                candle.time.getTime() + durationMs <= Date.now());
            received += missingCandles.length;
            saved += await this.saveCandles(symbol, timeframe, missingCandles);
        }
        return { gapsFound, received, saved };
    }
    async syncBinanceCandles(symbol, timeframe) {
        const candles = await this.marketDataProviderService.getBinanceCandles(symbol, timeframe, 1000);
        const timeframeMs = {
            [timeframe_enum_1.Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
            [timeframe_enum_1.Timeframe.ONE_HOUR]: 60 * 60 * 1000,
            [timeframe_enum_1.Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
            [timeframe_enum_1.Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
        };
        const now = Date.now();
        const closedCandles = candles.filter((candle) => candle.time.getTime() + timeframeMs[timeframe] <= now);
        return this.saveCandles(symbol, timeframe, closedCandles);
    }
    async getLiveCandleOpen(symbol, timeframe, expectedOpenTime) {
        const candles = await this.marketDataProviderService.getBinanceCandles(symbol, timeframe, 2);
        const candle = candles.find((candidate) => candidate.time.getTime() === expectedOpenTime.getTime());
        if (!candle ||
            candle.time.getTime() + timeframe_utils_1.timeframeDurationMs[timeframe] <= Date.now() ||
            !Number.isFinite(candle.open)) {
            return null;
        }
        return candle.open;
    }
    async backfillBinanceCandles(symbol, timeframe, days) {
        const timeframeMs = {
            [timeframe_enum_1.Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
            [timeframe_enum_1.Timeframe.ONE_HOUR]: 60 * 60 * 1000,
            [timeframe_enum_1.Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
            [timeframe_enum_1.Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
        };
        const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
        const earliestStoredCandle = await this.storageService.findEarliestCandle(symbol, timeframe);
        if (earliestStoredCandle !== null &&
            earliestStoredCandle.time.getTime() <= startTime) {
            return { received: 0, saved: 0 };
        }
        let endTime = earliestStoredCandle === null
            ? Date.now()
            : earliestStoredCandle.time.getTime() - 1;
        let received = 0;
        let saved = 0;
        while (endTime >= startTime) {
            const batch = await this.marketDataProviderService.getBinanceCandles(symbol, timeframe, 10_000, endTime);
            const closedBatch = batch.filter((candle) => candle.time.getTime() >= startTime &&
                candle.time.getTime() + timeframeMs[timeframe] <= Date.now());
            if (closedBatch.length === 0) {
                break;
            }
            received += closedBatch.length;
            saved += await this.saveCandles(symbol, timeframe, closedBatch);
            const oldestTime = closedBatch[0].time.getTime();
            if (oldestTime <= startTime || batch.length < 1000) {
                break;
            }
            endTime = oldestTime - 1;
        }
        return { received, saved };
    }
    async saveCandles(symbol, timeframe, candles) {
        let savedCount = 0;
        for (const candle of candles) {
            try {
                await this.storageService.createCandle({
                    symbol,
                    timeframe,
                    time: candle.time.toISOString(),
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume,
                });
                savedCount++;
            }
            catch (error) {
                if (error instanceof common_1.ConflictException) {
                    continue;
                }
                throw error;
            }
        }
        return savedCount;
    }
};
exports.MarketDataService = MarketDataService;
exports.MarketDataService = MarketDataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [market_candle_storage_service_1.MarketCandleStorageService,
        market_data_analysis_service_1.MarketDataAnalysisService,
        market_data_provider_service_1.MarketDataProviderService])
], MarketDataService);
//# sourceMappingURL=market-data.service.js.map