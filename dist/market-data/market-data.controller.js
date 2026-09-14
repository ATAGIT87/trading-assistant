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
let MarketDataController = class MarketDataController {
    marketDataService;
    constructor(marketDataService) {
        this.marketDataService = marketDataService;
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
exports.MarketDataController = MarketDataController = __decorate([
    (0, common_1.Controller)("market-data"),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService])
], MarketDataController);
//# sourceMappingURL=market-data.controller.js.map