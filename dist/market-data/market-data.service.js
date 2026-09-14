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
let MarketDataService = class MarketDataService {
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
        return candle.close;
    }
    getCandlesForAnalysis(symbol, timeframe) {
        return this.findCandlesBySymbolAndTimeframe(symbol, timeframe);
    }
};
exports.MarketDataService = MarketDataService;
exports.MarketDataService = MarketDataService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(market_candle_entity_1.MarketCandle)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MarketDataService);
//# sourceMappingURL=market-data.service.js.map