import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class MarketDataService {
    private readonly marketCandleRepository;
    constructor(marketCandleRepository: Repository<MarketCandle>);
    createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle>;
    findAllCandles(): Promise<MarketCandle[]>;
    findCandlesBySymbol(symbol: string): Promise<MarketCandle[]>;
    findCandlesBySymbolAndTimeframe(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
    findLatestCandle(symbol: string, timeframe: Timeframe): Promise<MarketCandle | null>;
    getLatestPrice(symbol: string, timeframe: Timeframe): Promise<string | null>;
    getCandlesForAnalysis(symbol: string, timeframe: Timeframe): Promise<MarketCandle[]>;
}
