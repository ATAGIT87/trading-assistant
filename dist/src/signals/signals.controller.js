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
exports.SignalsController = void 0;
const common_1 = require("@nestjs/common");
const signals_service_1 = require("./signals.service");
const signal_storage_service_1 = require("./signal-storage.service");
const timeframe_enum_1 = require("../assets/enums/timeframe.enum");
const signal_response_schema_1 = require("./signal-response.schema");
let SignalsController = class SignalsController {
    signalsService;
    signalStorageService;
    constructor(signalsService, signalStorageService) {
        this.signalsService = signalsService;
        this.signalStorageService = signalStorageService;
    }
    getSignalHistory(symbol, timeframe) {
        return this.signalStorageService.getSignalHistory(symbol, timeframe);
    }
    getLatestSignal(symbol, timeframe) {
        return this.signalStorageService.getLatestSignal(symbol, timeframe);
    }
    async getLiveV2Signal(symbol, timeframe) {
        const result = await this.signalsService.getLiveV2Signal(symbol, timeframe);
        return result;
    }
    async generateSignal(symbol, timeframe, period) {
        const result = await this.signalsService.generateSignal(symbol, timeframe, period);
        return signal_response_schema_1.SignalResponseSchema.parse(result);
    }
};
exports.SignalsController = SignalsController;
__decorate([
    (0, common_1.Get)("history/:symbol/:timeframe"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SignalsController.prototype, "getSignalHistory", null);
__decorate([
    (0, common_1.Get)("latest/:symbol/:timeframe"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SignalsController.prototype, "getLatestSignal", null);
__decorate([
    (0, common_1.Get)(":symbol/:timeframe"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SignalsController.prototype, "getLiveV2Signal", null);
__decorate([
    (0, common_1.Get)(":symbol/:timeframe/:period"),
    __param(0, (0, common_1.Param)("symbol")),
    __param(1, (0, common_1.Param)("timeframe")),
    __param(2, (0, common_1.Param)("period", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], SignalsController.prototype, "generateSignal", null);
exports.SignalsController = SignalsController = __decorate([
    (0, common_1.Controller)("signals"),
    __metadata("design:paramtypes", [signals_service_1.SignalsService,
        signal_storage_service_1.SignalStorageService])
], SignalsController);
//# sourceMappingURL=signals.controller.js.map