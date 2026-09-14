import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
export declare class MarketDataService {
    private readonly marketCandleRepository;
    private readonly indicatorsService;
    constructor(marketCandleRepository: Repository<MarketCandle>, indicatorsService: IndicatorsService);
    createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle>;
    findAllCandles(): Promise<MarketCandle[]>;
    findCandlesBySymbol(symbol: string): Promise<MarketCandle[]>;
    findCandlesBySymbolAndTimeframe(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
    findLatestCandle(symbol: string, timeframe: Timeframe): Promise<MarketCandle | null>;
    getLatestPrice(symbol: string, timeframe: Timeframe): Promise<string | null>;
    getCandlesForAnalysis(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
    getLatestRsi(symbol: string, timeframe: Timeframe): Promise<number | null>;
    getLatestSma(symbol: string, timeframe: Timeframe, period: number): Promise<number | null>;
    getLatestEma(symbol: string, timeframe: Timeframe, period: number): Promise<number | null>;
    compareLatestPriceToSma(symbol: string, timeframe: Timeframe, period: number): Promise<"ABOVE" | "BELOW" | "EQUAL" | null>;
    compareLatestPriceToEma(symbol: string, timeframe: Timeframe, period: number): Promise<"ABOVE" | "BELOW" | "EQUAL" | null>;
    compareSmaToEma(symbol: string, timeframe: Timeframe, period: number): Promise<"SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" | null>;
    getTrend(symbol: string, timeframe: Timeframe, period: number): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null>;
    getRsiStatus(symbol: string, timeframe: Timeframe, period: number): Promise<"OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | null>;
    getMarketCondition(symbol: string, timeframe: Timeframe, period: number): Promise<"POSSIBLE_REVERSAL" | "BEARISH_CONTINUATION" | "BULLISH_CONTINUATION" | "NEUTRAL" | null>;
}
