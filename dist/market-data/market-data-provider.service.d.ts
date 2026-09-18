export declare class MarketDataProviderService {
    private readonly baseUrl;
    getLatestPrice(symbol: string): Promise<number>;
    getHourlyMarketData(symbol: string, days?: number): Promise<{
        time: Date;
        price: number;
        volume: number;
    }[]>;
    getRealCandles(symbol: string, days?: number): Promise<{
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
    }[]>;
    getHourlyCandles(symbol: string, days?: number): Promise<{
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
    }[]>;
    getBinanceCandles(symbol: string, timeframe: string, limit?: number): Promise<{
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[]>;
    getBinanceHourlyCandles(symbol: string, limit?: number): Promise<{
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[]>;
    private normalizeSymbol;
    private validateTimeframe;
}
