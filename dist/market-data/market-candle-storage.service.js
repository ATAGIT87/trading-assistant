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
exports.MarketCandleStorageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const market_candle_entity_1 = require("./entities/market-candle.entity");
let MarketCandleStorageService = class MarketCandleStorageService {
    marketCandleRepository;
    constructor(marketCandleRepository) {
        this.marketCandleRepository = marketCandleRepository;
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
                error.driverError?.code ===
                    "23505") {
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
    findLatestCandle(symbol, timeframe) {
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
    getCandlesForAnalysis(symbol, timeframe) {
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
    getHistoricalCandles(symbol, timeframe) {
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
    getHistoricalCandlesUntil(symbol, timeframe, until) {
        return this.marketCandleRepository.find({
            where: {
                symbol,
                timeframe,
                time: (0, typeorm_2.LessThanOrEqual)(until),
            },
            order: {
                time: "ASC",
            },
        });
    }
    async deleteFourHourCandles(symbol) {
        await this.marketCandleRepository.delete({
            symbol,
            timeframe: timeframe_enum_1.Timeframe.FOUR_HOURS,
        });
    }
    async saveCandles(candles) {
        return this.marketCandleRepository.save(candles);
    }
};
exports.MarketCandleStorageService = MarketCandleStorageService;
exports.MarketCandleStorageService = MarketCandleStorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(market_candle_entity_1.MarketCandle)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MarketCandleStorageService);
//# sourceMappingURL=market-candle-storage.service.js.map