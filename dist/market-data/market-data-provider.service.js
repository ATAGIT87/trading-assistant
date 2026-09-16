"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataProviderService = void 0;
const common_1 = require("@nestjs/common");
let MarketDataProviderService = class MarketDataProviderService {
    baseUrl = "https://api.coingecko.com/api/v3";
    async getLatestPrice(symbol) {
        const normalizedSymbol = symbol.toUpperCase();
        if (normalizedSymbol !== "BTCUSD") {
            throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
        }
        const response = await fetch(`${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd`);
        if (!response.ok) {
            throw new Error(`Market data request failed: ${response.status}`);
        }
        const data = (await response.json());
        const price = data.bitcoin?.usd;
        if (typeof price !== "number") {
            throw new Error("Invalid BTC price returned by market data provider");
        }
        return price;
    }
    async getHourlyMarketData(symbol, days = 30) {
        const normalizedSymbol = symbol.toUpperCase();
        if (normalizedSymbol !== "BTCUSD") {
            throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
        }
        const response = await fetch(`${this.baseUrl}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`);
        if (!response.ok) {
            throw new Error(`Market data request failed: ${response.status}`);
        }
        const data = (await response.json());
        return data.prices.map(([timestamp, price], index) => ({
            time: new Date(timestamp),
            price,
            volume: data.total_volumes[index]?.[1] ?? 0,
        }));
    }
    async getHourlyCandles(symbol, days = 30) {
        const normalizedSymbol = symbol.toUpperCase();
        if (normalizedSymbol !== "BTCUSD") {
            throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
        }
        const response = await fetch(`${this.baseUrl}/coins/bitcoin/ohlc?vs_currency=usd&days=1`);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("CoinGecko OHLC error:", response.status, errorBody);
            throw new Error(`Market OHLC request failed: ${response.status} ${errorBody}`);
        }
        const data = (await response.json());
        return data.map(([timestamp, open, high, low, close]) => ({
            time: new Date(timestamp),
            open,
            high,
            low,
            close,
        }));
    }
};
exports.MarketDataProviderService = MarketDataProviderService;
exports.MarketDataProviderService = MarketDataProviderService = __decorate([
    (0, common_1.Injectable)()
], MarketDataProviderService);
//# sourceMappingURL=market-data-provider.service.js.map