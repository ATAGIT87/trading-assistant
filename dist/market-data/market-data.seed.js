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
exports.MarketDataSeed = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const market_candle_entity_1 = require("./entities/market-candle.entity");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const common_1 = require("@nestjs/common");
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
        for (let i = 0; i < 100; i++) {
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
        await this.marketCandleRepository.delete({
            symbol: "BTCUSD",
            timeframe: timeframe_enum_1.Timeframe.ONE_HOUR,
        });
        await this.marketCandleRepository.save(candles);
    }
};
exports.MarketDataSeed = MarketDataSeed;
exports.MarketDataSeed = MarketDataSeed = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(market_candle_entity_1.MarketCandle)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MarketDataSeed);
//# sourceMappingURL=market-data.seed.js.map