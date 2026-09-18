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
exports.BacktestingController = void 0;
const common_1 = require("@nestjs/common");
const backtesting_service_1 = require("./backtesting.service");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
let BacktestingController = class BacktestingController {
    backtestingService;
    constructor(backtestingService) {
        this.backtestingService = backtestingService;
    }
    async runBacktest(symbol, timeframe) {
        const result = await this.backtestingService.run(symbol, timeframe);
        return result;
    }
};
exports.BacktestingController = BacktestingController;
__decorate([
    (0, common_1.Get)(":symbol/:timeframe"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BacktestingController.prototype, "runBacktest", null);
exports.BacktestingController = BacktestingController = __decorate([
    (0, common_1.Controller)("backtesting"),
    __metadata("design:paramtypes", [backtesting_service_1.BacktestingService])
], BacktestingController);
//# sourceMappingURL=backtesting.controller.js.map