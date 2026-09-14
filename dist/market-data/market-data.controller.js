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
exports.MarketDataController = void 0;
const common_1 = require("@nestjs/common");
const create_market_candle_dto_1 = require("./dto/create-market-candle.dto");
const market_data_service_1 = require("./market-data.service");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const market_data_seed_1 = require("./market-data.seed");
let MarketDataController = class MarketDataController {
    marketDataService;
    marketDataSeed;
    constructor(marketDataService, marketDataSeed) {
        this.marketDataService = marketDataService;
        this.marketDataSeed = marketDataSeed;
    }
    createCandle(dto) {
        return this.marketDataService.createCandle(dto);
    }
    findAllCandles() {
        return this.marketDataService.findAllCandles();
    }
    findCandlesBySymbol(symbol) {
        return this.marketDataService.findCandlesBySymbol(symbol);
    }
    findCandlesBySymbolAndTimeframe(symbol, timeframe) {
        return this.marketDataService.findCandlesBySymbolAndTimeframe(symbol, timeframe);
    }
    findLatestCandle(symbol, timeframe) {
        return this.marketDataService.findLatestCandle(symbol, timeframe);
    }
    seed() {
        return this.marketDataSeed.seed();
    }
    getLatestRsi(symbol, timeframe) {
        return this.marketDataService.getLatestRsi(symbol, timeframe);
    }
    getLatestSma(symbol, timeframe, period) {
        return this.marketDataService.getLatestSma(symbol, timeframe, Number(period));
    }
    getLatestEma(symbol, period, timeframe) {
        return this.marketDataService.getLatestEma(symbol, timeframe, Number(period));
    }
    compareLatestPriceToSma(symbol, timeframe, period) {
        return this.marketDataService.compareLatestPriceToSma(symbol, timeframe, Number(period));
    }
    compareLatestPriceToEma(symbol, timeframe, period) {
        return this.marketDataService.compareLatestPriceToEma(symbol, timeframe, Number(period));
    }
    compareSmaToEma(symbol, timeframe, period) {
        return this.marketDataService.compareSmaToEma(symbol, timeframe, Number(period));
    }
};
exports.MarketDataController = MarketDataController;
__decorate([
    (0, common_1.Post)("candles"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_market_candle_dto_1.CreateMarketCandleDto]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "createCandle", null);
__decorate([
    (0, common_1.Get)("candles"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "findAllCandles", null);
__decorate([
    (0, common_1.Get)("candles/:symbol"),
    __param(0, (0, common_1.Param)("symbol")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "findCandlesBySymbol", null);
__decorate([
    (0, common_1.Get)("candles/:symbol/:timeframe"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "findCandlesBySymbolAndTimeframe", null);
__decorate([
    (0, common_1.Get)("candles/:symbol/:timeframe/latest"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "findLatestCandle", null);
__decorate([
    (0, common_1.Post)('seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "seed", null);
__decorate([
    (0, common_1.Get)('candles/:symbol/:timeframe/rsi'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Param)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "getLatestRsi", null);
__decorate([
    (0, common_1.Get)('candles/:symbol/:timeframe/sma/:period'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Param)('timeframe')),
    __param(2, (0, common_1.Param)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "getLatestSma", null);
__decorate([
    (0, common_1.Get)('candles/:symbol/:timeframe/ema/:period'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Param)('period')),
    __param(2, (0, common_1.Param)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "getLatestEma", null);
__decorate([
    (0, common_1.Get)('candles/:symbol/:timeframe/price-vs-sma/:period'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Param)('timeframe')),
    __param(2, (0, common_1.Param)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "compareLatestPriceToSma", null);
__decorate([
    (0, common_1.Get)('candles/:symbol/:timeframe/price-vs-ema/:period'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Param)('timeframe')),
    __param(2, (0, common_1.Param)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "compareLatestPriceToEma", null);
__decorate([
    (0, common_1.Get)('candles/:symbol/:timeframe/sma-vs-ema/:period'),
    __param(0, (0, common_1.Param)('symbol')),
    __param(1, (0, common_1.Param)('timeframe')),
    __param(2, (0, common_1.Param)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MarketDataController.prototype, "compareSmaToEma", null);
exports.MarketDataController = MarketDataController = __decorate([
    (0, common_1.Controller)("market-data"),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService,
        market_data_seed_1.MarketDataSeed])
], MarketDataController);
//# sourceMappingURL=market-data.controller.js.map