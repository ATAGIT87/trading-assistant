export declare class MarketDataProviderService {
    getBinanceCandles(symbol: string, timeframe: string, limit?: number, initialEndTime?: number): Promise<{
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[]>;
    private getBinanceCandlesFromUrl;
    getBinanceHourlyCandles(symbol: string, limit?: number): Promise<{
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[]>;
    private parseSpotKline;
    private validateTimeframe;
}
