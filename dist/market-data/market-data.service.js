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
exports.MarketDataService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const market_candle_entity_1 = require("./entities/market-candle.entity");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const indicators_service_1 = require("../indicators/indicators.service");
const typeorm_3 = require("typeorm");
const market_data_provider_service_1 = require("./market-data-provider.service");
let MarketDataService = class MarketDataService {
    marketCandleRepository;
    indicatorsService;
    marketDataProviderService;
    constructor(marketCandleRepository, indicatorsService, marketDataProviderService) {
        this.marketCandleRepository = marketCandleRepository;
        this.indicatorsService = indicatorsService;
        this.marketDataProviderService = marketDataProviderService;
    }
    async createCandle(dto) {
        try {
            const candle = this.marketCandleRepository.create({
                symbol: dto.symbol,
                timeframe: dto.timeframe,
                time: new Date(dto.time),
                open: dto.open.toString(),
                high: dto.high.toString(),
                low: dto.low.toString(),
                close: dto.close.toString(),
                volume: dto.volume.toString(),
            });
            return await this.marketCandleRepository.save(candle);
        }
        catch (error) {
            if (error instanceof typeorm_2.QueryFailedError &&
                error.driverError?.code === "23505") {
                throw new common_1.ConflictException("Candle already exists");
            }
            throw error;
        }
    }
    findAllCandles() {
        return this.marketCandleRepository.find();
    }
    findCandlesBySymbol(symbol) {
        return this.marketCandleRepository.find({
            where: {
                symbol,
            },
        });
    }
    findCandlesBySymbolAndTimeframe(symbol, timeframe) {
        return this.marketCandleRepository.find({
            where: {
                symbol,
                timeframe,
            },
            order: {
                time: "DESC",
            },
            take: 100,
        });
    }
    async findLatestCandle(symbol, timeframe) {
        return this.marketCandleRepository.findOne({
            where: {
                symbol,
                timeframe,
            },
            order: {
                time: "DESC",
            },
        });
    }
    async getLatestPrice(symbol, timeframe) {
        const candle = await this.findLatestCandle(symbol, timeframe);
        if (!candle) {
            return null;
        }
        return Number(candle.close);
    }
    async getCandlesForAnalysis(symbol, timeframe) {
        return this.marketCandleRepository.find({
            where: {
                symbol,
                timeframe,
            },
            order: {
                time: "ASC",
            },
            take: 100,
        });
    }
    async getLatestRsi(symbol, timeframe) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.indicatorsService.calculateRsiFromCandles(candles, 14);
    }
    async getLatestSma(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.indicatorsService.calculateSmaFromCandles(candles, period);
    }
    async getLatestEma(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.indicatorsService.calculateEma(candles.map((candle) => Number(candle.close)), period);
    }
    async compareLatestPriceToSma(symbol, timeframe, period) {
        const price = await this.getLatestPrice(symbol, timeframe);
        const sma = await this.getLatestSma(symbol, timeframe, period);
        if (price === null || sma === null) {
            return null;
        }
        return this.indicatorsService.comparePriceToAverage(Number(price), sma);
    }
    async compareLatestPriceToEma(symbol, timeframe, period) {
        const price = await this.getLatestPrice(symbol, timeframe);
        const ema = await this.getLatestEma(symbol, timeframe, period);
        if (price === null || ema === null) {
            return null;
        }
        return this.indicatorsService.comparePriceToAverage(Number(price), ema);
    }
    async compareSmaToEma(symbol, timeframe, period) {
        const sma = await this.getLatestSma(symbol, timeframe, period);
        const ema = await this.getLatestEma(symbol, timeframe, period);
        if (sma === null || ema === null) {
            return null;
        }
        return this.indicatorsService.compareSmaToEma(sma, ema);
    }
    async getTrend(symbol, timeframe, period) {
        const price = await this.getLatestPrice(symbol, timeframe);
        const sma = await this.getLatestSma(symbol, timeframe, period);
        const ema = await this.getLatestEma(symbol, timeframe, period);
        if (price === null || sma === null || ema === null) {
            return null;
        }
        const priceVsSma = this.indicatorsService.comparePriceToAverage(Number(price), sma);
        const priceVsEma = this.indicatorsService.comparePriceToAverage(Number(price), ema);
        return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
    }
    async getRsiStatus(symbol, timeframe, period) {
        const rsi = await this.getLatestRsi(symbol, timeframe);
        if (rsi === null) {
            return null;
        }
        return this.indicatorsService.classifyRsi(rsi);
    }
    async getMarketCondition(symbol, timeframe, period) {
        const trend = await this.getTrend(symbol, timeframe, period);
        const rsiStatus = await this.getRsiStatus(symbol, timeframe, period);
        if (trend === null || rsiStatus === null) {
            return null;
        }
        return this.indicatorsService.determineMarketCondition(trend, rsiStatus);
    }
    async getLatestAtr(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
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
    async getLatestAdx(symbol, timeframe, period) {
        const candles = await this.getCandlesForAnalysis(symbol, timeframe);
        return this.indicatorsService.calculateAdxFromCandles(candles.map((candle) => ({
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        })), period);
    }
    async getHistoricalCandles(symbol, timeframe) {
        return this.marketCandleRepository.find({
            where: {
                symbol,
                timeframe,
            },
            order: {
                time: "ASC",
            },
        });
    }
    async getHistoricalCandlesUntil(symbol, timeframe, until) {
        return this.marketCandleRepository.find({
            where: {
                symbol,
                timeframe,
                time: (0, typeorm_3.LessThanOrEqual)(until),
            },
            order: {
                time: "ASC",
            },
        });
    }
    async buildFourHourCandles(symbol) {
        const hourlyCandles = await this.marketCandleRepository.find({
            where: {
                symbol,
                timeframe: timeframe_enum_1.Timeframe.ONE_HOUR,
            },
            order: {
                time: "ASC",
            },
        });
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
            candles.sort((a, b) => a.time.getTime() -
                b.time.getTime());
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
            fourHourCandle.timeframe =
                timeframe_enum_1.Timeframe.FOUR_HOURS;
            fourHourCandle.time =
                new Date(startTime);
            fourHourCandle.open =
                first.open;
            fourHourCandle.high =
                high.toString();
            fourHourCandle.low =
                low.toString();
            fourHourCandle.close =
                last.close;
            fourHourCandle.volume =
                volume.toString();
            fourHourCandles.push(fourHourCandle);
        }
        await this.marketCandleRepository.delete({
            symbol,
            timeframe: timeframe_enum_1.Timeframe.FOUR_HOURS,
        });
        if (fourHourCandles.length === 0) {
            return 0;
        }
        await this.marketCandleRepository.save(fourHourCandles);
        return fourHourCandles.length;
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
    async saveCandles(symbol, timeframe, candles) {
        let savedCount = 0;
        for (const candle of candles) {
            try {
                await this.createCandle({
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
    __param(0, (0, typeorm_1.InjectRepository)(market_candle_entity_1.MarketCandle)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        indicators_service_1.IndicatorsService,
        market_data_provider_service_1.MarketDataProviderService])
], MarketDataService);
//# sourceMappingURL=market-data.service.js.map