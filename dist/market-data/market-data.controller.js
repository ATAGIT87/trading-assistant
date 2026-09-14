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
let MarketDataController = class MarketDataController {
    marketDataService;
    constructor(marketDataService) {
        this.marketDataService = marketDataService;
    }
    createCandle(dto) {
        return this.marketDataService.createCandle(dto);
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
exports.MarketDataController = MarketDataController = __decorate([
    (0, common_1.Controller)("market-data"),
    __metadata("design:paramtypes", [market_data_service_1.MarketDataService])
], MarketDataController);
//# sourceMappingURL=market-data.controller.js.map