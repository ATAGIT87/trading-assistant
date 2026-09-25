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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataSeed = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const market_candle_entity_1 = require("./entities/market-candle.entity");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
let MarketDataSeed = class MarketDataSeed {
    marketCandleRepository;
    constructor(marketCandleRepository) {
        this.marketCandleRepository = marketCandleRepository;
    }
    async onModuleInit() {
        await this.seed();
    }
    async seed() {
        const candles = [];
        let price = 115000;
        for (let i = 0; i < 120; i++) {
            candles.push({
                symbol: "BTCUSD",
                timeframe: timeframe_enum_1.Timeframe.ONE_HOUR,
                time: new Date(Date.UTC(2026, 8, 14, i, 0)),
                open: price.toString(),
                high: (price + 1000).toString(),
                low: (price - 1000).toString(),
                close: (price + 100).toString(),
                volume: "100",
            });
            price += i < 50 ? 500 : -500;
        }
        const fourHourCandles = [];
        for (let i = 0; i < candles.length; i += 4) {
            const group = candles.slice(i, i + 4);
            if (group.length < 4) {
                continue;
            }
            fourHourCandles.push({
                symbol: "BTCUSD",
                timeframe: timeframe_enum_1.Timeframe.FOUR_HOURS,
                time: group[0].time,
                open: group[0].open,
                high: Math.max(...group.map((candle) => Number(candle.high))).toString(),
                low: Math.min(...group.map((candle) => Number(candle.low))).toString(),
                close: group[group.length - 1].close,
                volume: group
                    .reduce((sum, candle) => sum + Number(candle.volume), 0)
                    .toString(),
            });
        }
        await this.marketCandleRepository.delete({
            symbol: "BTCUSD",
            timeframe: timeframe_enum_1.Timeframe.ONE_HOUR,
        });
        await this.marketCandleRepository.delete({
            symbol: "BTCUSD",
            timeframe: timeframe_enum_1.Timeframe.FOUR_HOURS,
        });
        await this.marketCandleRepository.save(candles);
        await this.marketCandleRepository.save(fourHourCandles);
    }
};
exports.MarketDataSeed = MarketDataSeed;
exports.MarketDataSeed = MarketDataSeed = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(market_candle_entity_1.MarketCandle)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], MarketDataSeed);
//# sourceMappingURL=market-data.seed.js.map