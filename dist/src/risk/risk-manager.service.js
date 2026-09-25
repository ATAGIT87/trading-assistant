"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManagerService = void 0;
const common_1 = require("@nestjs/common");
let RiskManagerService = class RiskManagerService {
    calculateLevels(action, entryPrice, candles, atr) {
        if ((action !== "BUY" && action !== "SELL") ||
            entryPrice <= 0 ||
            atr <= 0 ||
            candles.length < 5) {
            return {
                stopLoss: null,
                takeProfit: null,
                riskReward: null,
            };
        }
        const recentCandles = candles.slice(-10);
        const recentHigh = Math.max(...recentCandles.map((candle) => Number(candle.high)));
        const recentLow = Math.min(...recentCandles.map((candle) => Number(candle.low)));
        const atrRisk = atr * 1.5;
        let stopLoss;
        let takeProfit;
        if (action === "BUY") {
            stopLoss = Math.min(entryPrice - atrRisk, recentLow);
            const risk = entryPrice - stopLoss;
            takeProfit =
                entryPrice + risk * 2;
        }
        else {
            stopLoss = Math.max(entryPrice + atrRisk, recentHigh);
            const risk = stopLoss - entryPrice;
            takeProfit =
                entryPrice - risk * 2;
        }
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        if (risk <= 0) {
            return {
                stopLoss: null,
                takeProfit: null,
                riskReward: null,
            };
        }
        return {
            stopLoss,
            takeProfit,
            riskReward: reward / risk,
        };
    }
};
exports.RiskManagerService = RiskManagerService;
exports.RiskManagerService = RiskManagerService = __decorate([
    (0, common_1.Injectable)()
], RiskManagerService);
//# sourceMappingURL=risk-manager.service.js.map