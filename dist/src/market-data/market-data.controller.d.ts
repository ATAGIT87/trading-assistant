import { MarketDataProviderService } from "./market-data-provider.service";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class MarketDataController {
    private readonly marketDataService;
    private readonly marketDataProviderService;
    constructor(marketDataService: MarketDataService, marketDataProviderService: MarketDataProviderService);
    createCandle(dto: CreateMarketCandleDto): Promise<import("./entities/market-candle.entity").MarketCandle>;
    findAllCandles(): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findCandlesBySymbol(symbol: string): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findCandlesBySymbolAndTimeframe(symbol: string, timeframe: Timeframe): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findLatestCandle(symbol: string, timeframe: Timeframe): Promise<import("./entities/market-candle.entity").MarketCandle | null>;
    getDataQuality(symbol: string, timeframe: Timeframe): Promise<import("./market-data-quality").MarketDataQualityReport>;
    getLatestRsi(symbol: string, timeframe: Timeframe): Promise<number | null>;
    getLatestSma(symbol: string, timeframe: Timeframe, period: string): Promise<number | null>;
    getLatestEma(symbol: string, period: string, timeframe: Timeframe): Promise<number | null>;
    compareLatestPriceToSma(symbol: string, timeframe: Timeframe, period: string): Promise<"ABOVE" | "BELOW" | "EQUAL" | null>;
    compareLatestPriceToEma(symbol: string, timeframe: Timeframe, period: string): Promise<"ABOVE" | "BELOW" | "EQUAL" | null>;
    compareSmaToEma(symbol: string, timeframe: Timeframe, period: string): Promise<"SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" | null>;
    getTrend(symbol: string, timeframe: Timeframe, period: string): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null>;
    getRsiStatus(symbol: string, timeframe: Timeframe, period: string): Promise<"NEUTRAL" | "OVERSOLD" | "OVERBOUGHT" | null>;
    getMarketCondition(symbol: string, timeframe: Timeframe, period: string): Promise<"NEUTRAL" | "POSSIBLE_REVERSAL" | "BEARISH_CONTINUATION" | "BULLISH_CONTINUATION" | null>;
    getLatestAtr(symbol: string, timeframe: Timeframe, period: string): Promise<number | null>;
    getLatestAdx(symbol: string, timeframe: Timeframe, period: number): Promise<number | null>;
    getSpotCandles(symbol: string): Promise<import("./market-data-provider.service").SpotCandle[]>;
    syncSpotCandles(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        received: number;
        saved: number;
    }>;
    backfillSpotCandles(symbol: string, timeframe: Timeframe, days?: string): Promise<{
        received: number;
        saved: number;
    }>;
    repairSpotGaps(symbol: string, timeframe: Timeframe): Promise<{
        gapsFound: number;
        received: number;
        saved: number;
    }>;
    buildFourHourCandles(symbol: string): Promise<{
        symbol: string;
        timeframe: string;
        saved: number;
    }>;
}
