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
exports.SignalStorageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const signal_entity_1 = require("./entities/signal.entity");
let SignalStorageService = class SignalStorageService {
    signalRepository;
    constructor(signalRepository) {
        this.signalRepository = signalRepository;
    }
    async saveSignal(symbol, timeframe, signal) {
        const entity = this.signalRepository.create({
            symbol,
            timeframe,
            action: signal.action,
            confidence: signal.confidence,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            trend: signal.trend,
            rsi: signal.rsi,
            adx: signal.adx,
            marketCondition: signal.marketCondition,
            isStrongSetup: signal.isStrongSetup,
            reason: signal.reason,
            candleTime: signal.candleTime,
        });
        return this.signalRepository.save(entity);
    }
    async getSignalHistory(symbol, timeframe) {
        return this.signalRepository.find({
            where: {
                symbol,
                timeframe,
            },
            order: {
                createdAt: "DESC",
            },
            take: 50,
        });
    }
    async getLatestSignal(symbol, timeframe) {
        return this.signalRepository.findOne({
            where: {
                symbol,
                timeframe,
            },
            order: {
                createdAt: "DESC",
            },
        });
    }
    async getSignalByCandleTime(symbol, timeframe, candleTime) {
        return this.signalRepository.findOne({
            where: {
                symbol,
                timeframe,
                candleTime,
            },
        });
    }
};
exports.SignalStorageService = SignalStorageService;
exports.SignalStorageService = SignalStorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(signal_entity_1.Signal)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SignalStorageService);
//# sourceMappingURL=signal-storage.service.js.map