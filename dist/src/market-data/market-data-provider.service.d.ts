export type SpotCandle = {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};
export declare class MarketDataProviderService {
    private readonly krakenPairs;
    getSpotCandles(symbol: string, timeframe: string, limit?: number): Promise<SpotCandle[]>;
    private parseKrakenOhlc;
    private toKrakenInterval;
    private validateTimeframe;
}
