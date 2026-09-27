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
const trading_symbol_1 = require("./trading-symbol");
let MarketDataProviderService = class MarketDataProviderService {
    async getBinanceCandles(symbol, timeframe, limit = 1000, initialEndTime = Date.now()) {
        const normalizedSymbol = (0, trading_symbol_1.normalizeTradingSymbol)(symbol);
        this.validateTimeframe(timeframe);
        const binanceSymbol = normalizedSymbol;
        if (limit < 1 || limit > 10000) {
            throw new Error(`Invalid candle limit: ${limit}. Must be between 1 and 10000.`);
        }
        return this.getBinanceCandlesFromUrl("https://api.binance.com/api/v3/klines", binanceSymbol, timeframe, limit, initialEndTime);
    }
    async getBinanceCandlesFromUrl(endpoint, binanceSymbol, timeframe, limit, initialEndTime) {
        const allCandles = [];
        let endTime = initialEndTime;
        while (allCandles.length < limit) {
            const requestLimit = Math.min(1000, limit - allCandles.length);
            const response = await fetch(`${endpoint}?symbol=${binanceSymbol}&interval=${timeframe}&limit=${requestLimit}&endTime=${endTime}`, { signal: AbortSignal.timeout(10_000) });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Binance market data request failed: ${response.status} ${errorBody}`);
            }
            const data = (await response.json());
            if (data.length === 0) {
                break;
            }
            const candles = data.map((candle) => this.parseSpotKline(candle));
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
    parseSpotKline(candle) {
        if (candle.length < 6) {
            throw new Error("Binance market data response contains an incomplete kline.");
        }
        const time = new Date(Number(candle[0]));
        const open = Number(candle[1]);
        const high = Number(candle[2]);
        const low = Number(candle[3]);
        const close = Number(candle[4]);
        const volume = Number(candle[5]);
        if (!Number.isFinite(time.getTime()) ||
            ![open, high, low, close, volume].every(Number.isFinite) ||
            low > Math.min(open, close) ||
            high < Math.max(open, close) ||
            low < 0 ||
            volume < 0) {
            throw new Error("Binance market data response contains an invalid Spot kline.");
        }
        return { time, open, high, low, close, volume };
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