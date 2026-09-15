import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketDataSeed } from "./market-data.seed";
export declare class MarketDataController {
    private readonly marketDataService;
    private readonly marketDataSeed;
    constructor(marketDataService: MarketDataService, marketDataSeed: MarketDataSeed);
    createCandle(dto: CreateMarketCandleDto): Promise<import("./entities/market-candle.entity").MarketCandle>;
    findAllCandles(): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findCandlesBySymbol(symbol: string): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findCandlesBySymbolAndTimeframe(symbol: string, timeframe: Timeframe): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findLatestCandle(symbol: string, timeframe: Timeframe): Promise<import("./entities/market-candle.entity").MarketCandle | null>;
    seed(): Promise<void>;
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
}
