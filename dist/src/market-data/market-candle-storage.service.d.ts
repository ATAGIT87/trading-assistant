import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
export declare class MarketCandleStorageService {
    private readonly marketCandleRepository;
    constructor(marketCandleRepository: Repository<MarketCandle>);
    createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle>;
    findAllCandles(): Promise<MarketCandle[]>;
    findCandlesBySymbol(symbol: string): Promise<MarketCandle[]>;
    findCandlesBySymbolAndTimeframe(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
    findLatestCandle(symbol: string, timeframe: Timeframe): Promise<MarketCandle | null>;
    getCandlesForAnalysis(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
    getHistoricalCandles(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
    getHistoricalCandlesUntil(symbol: string, timeframe: Timeframe, until: Date): Promise<MarketCandle[]>;
    deleteFourHourCandles(symbol: string): Promise<void>;
    saveCandles(candles: MarketCandle[]): Promise<MarketCandle[]>;
}
