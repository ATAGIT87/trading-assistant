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
    krakenPairs = {
        BTCEUR: "XBTEUR",
        ETHEUR: "ETHEUR",
    };
    async getSpotCandles(symbol, timeframe, limit = 720) {
        const normalizedSymbol = (0, trading_symbol_1.normalizeTradingSymbol)(symbol);
        this.validateTimeframe(timeframe);
        if (!Number.isInteger(limit) || limit < 1 || limit > 720) {
            throw new Error("Kraken Spot OHLC supports a recent window of 1 to 720 candles.");
        }
        const pair = this.krakenPairs[normalizedSymbol];
        if (!pair)
            throw new Error(`No Kraken Spot pair mapping for ${normalizedSymbol}.`);
        const response = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${this.toKrakenInterval(timeframe)}`, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok)
            throw new Error(`Kraken market data request failed: ${response.status}`);
        const body = (await response.json());
        if (body.error?.length)
            throw new Error(`Kraken market data error: ${body.error.join(", ")}`);
        const rows = Object.entries(body.result ?? {}).find(([key]) => key !== "last")?.[1];
        if (!Array.isArray(rows))
            throw new Error("Kraken market data response contains no OHLC candles.");
        return rows
            .map((row) => this.parseKrakenOhlc(row))
            .slice(-limit)
            .sort((left, right) => left.time.getTime() - right.time.getTime());
    }
    parseKrakenOhlc(row) {
        if (!Array.isArray(row) || row.length < 7) {
            throw new Error("Kraken market data response contains an incomplete OHLC candle.");
        }
        const time = new Date(Number(row[0]) * 1000);
        const open = Number(row[1]);
        const high = Number(row[2]);
        const low = Number(row[3]);
        const close = Number(row[4]);
        const volume = Number(row[6]);
        if (!Number.isFinite(time.getTime()) || ![open, high, low, close, volume].every(Number.isFinite) || low > Math.min(open, close) || high < Math.max(open, close) || low < 0 || volume < 0) {
            throw new Error("Kraken market data response contains an invalid Spot OHLC candle.");
        }
        return { time, open, high, low, close, volume };
    }
    toKrakenInterval(timeframe) {
        return { "15m": 15, "1h": 60, "4h": 240, "1d": 1440 }[timeframe];
    }
    validateTimeframe(timeframe) {
        if (!(timeframe in { "15m": true, "1h": true, "4h": true, "1d": true }))
            throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
};
exports.MarketDataProviderService = MarketDataProviderService;
exports.MarketDataProviderService = MarketDataProviderService = __decorate([
    (0, common_1.Injectable)()
], MarketDataProviderService);
//# sourceMappingURL=market-data-provider.service.js.map