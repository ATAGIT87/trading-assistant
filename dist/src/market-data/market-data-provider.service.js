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
    async getRealCandles(symbol, days = 30) {
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
    async getHourlyCandles(symbol, days = 1) {
        const candles = await this.getRealCandles(symbol, days);
        const hourlyCandles = new Map();
        for (const candle of candles) {
            const hour = new Date(candle.time);
            hour.setUTCMinutes(0, 0, 0);
            const key = hour.toISOString();
            const existing = hourlyCandles.get(key);
            if (!existing) {
                hourlyCandles.set(key, {
                    time: hour,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                });
                continue;
            }
            existing.high = Math.max(existing.high, candle.high);
            existing.low = Math.min(existing.low, candle.low);
            existing.close = candle.close;
        }
        return Array.from(hourlyCandles.values()).sort((a, b) => a.time.getTime() - b.time.getTime());
    }
    async getBinanceCandles(symbol, timeframe, limit = 1000) {
        const normalizedSymbol = this.normalizeSymbol(symbol);
        this.validateTimeframe(timeframe);
        const binanceSymbolMap = {
            BTCUSD: "BTCUSDT",
            ETHUSD: "ETHUSDT",
        };
        const binanceSymbol = binanceSymbolMap[normalizedSymbol];
        if (!binanceSymbol) {
            throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
        }
        if (limit < 1 || limit > 10000) {
            throw new Error(`Invalid candle limit: ${limit}. Must be between 1 and 10000.`);
        }
        const allCandles = [];
        let endTime = Date.now();
        while (allCandles.length < limit) {
            const requestLimit = Math.min(1000, limit - allCandles.length);
            const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${timeframe}&limit=${requestLimit}&endTime=${endTime}`);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Binance market data request failed: ${response.status} ${errorBody}`);
            }
            const data = (await response.json());
            if (data.length === 0) {
                break;
            }
            const candles = data.map((candle) => ({
                time: new Date(Number(candle[0])),
                open: Number(candle[1]),
                high: Number(candle[2]),
                low: Number(candle[3]),
                close: Number(candle[4]),
                volume: Number(candle[5]),
            }));
            allCandles.unshift(...candles);
            const oldestCandle = candles[0];
            const oldestTime = oldestCandle.time.getTime();
            endTime = oldestTime - 1;
            if (data.length < requestLimit) {
                break;
            }
        }
        return allCandles
            .slice(-limit)
            .sort((a, b) => a.time.getTime() - b.time.getTime());
    }
    async getBinanceHourlyCandles(symbol, limit = 1000) {
        return this.getBinanceCandles(symbol, "1h", limit);
    }
    normalizeSymbol(symbol) {
        const normalizedSymbol = symbol.trim().toUpperCase();
        if (!normalizedSymbol) {
            throw new Error("Symbol is required");
        }
        return normalizedSymbol;
    }
    validateTimeframe(timeframe) {
        const supportedTimeframes = ["15m", "1h", "4h", "1d"];
        if (!supportedTimeframes.includes(timeframe)) {
            throw new Error(`Unsupported timeframe: ${timeframe}`);
        }
    }
};
exports.MarketDataProviderService = MarketDataProviderService;
exports.MarketDataProviderService = MarketDataProviderService = __decorate([
    (0, common_1.Injectable)()
], MarketDataProviderService);
//# sourceMappingURL=market-data-provider.service.js.map