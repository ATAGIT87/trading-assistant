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
exports.DemoTradingController = void 0;
const common_1 = require("@nestjs/common");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const demo_trading_service_1 = require("./demo-trading.service");
let DemoTradingController = class DemoTradingController {
    demoTradingService;
    constructor(demoTradingService) {
        this.demoTradingService = demoTradingService;
    }
    async openPosition(symbol, timeframe) {
        return this.demoTradingService.openPosition(symbol, timeframe);
    }
    async getOpenPositions() {
        return {
            openPositions: await this.demoTradingService.getOpenPositions(),
        };
    }
    async checkOpenPositions() {
        return this.demoTradingService.checkOpenPositions();
    }
    async getHistory() {
        const positions = await this.demoTradingService.getHistory();
        return {
            closedPositions: positions.map((position) => ({
                result: position.status,
                entry: position.entry,
                exitPrice: position.exitPrice,
                resultR: position.resultR,
                openedAt: position.openedAt,
                closedAt: position.closedAt,
                symbol: position.symbol,
                timeframe: position.timeframe,
                side: position.side,
            })),
        };
    }
};
exports.DemoTradingController = DemoTradingController;
__decorate([
    (0, common_1.Post)("open/:symbol/:timeframe"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DemoTradingController.prototype, "openPosition", null);
__decorate([
    (0, common_1.Get)("open"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DemoTradingController.prototype, "getOpenPositions", null);
__decorate([
    (0, common_1.Post)("check"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DemoTradingController.prototype, "checkOpenPositions", null);
__decorate([
    (0, common_1.Get)("history"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DemoTradingController.prototype, "getHistory", null);
exports.DemoTradingController = DemoTradingController = __decorate([
    (0, common_1.Controller)("demo-trading"),
    __metadata("design:paramtypes", [demo_trading_service_1.DemoTradingService])
], DemoTradingController);
//# sourceMappingURL=demo-trading.controller.js.map