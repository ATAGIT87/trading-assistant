import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class MarketDataController {
    private readonly marketDataService;
    constructor(marketDataService: MarketDataService);
    createCandle(dto: CreateMarketCandleDto): Promise<import("./entities/market-candle.entity").MarketCandle>;
    findAllCandles(): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findCandlesBySymbol(symbol: string): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findCandlesBySymbolAndTimeframe(symbol: string, timeframe: Timeframe): Promise<import("./entities/market-candle.entity").MarketCandle[]>;
    findLatestCandle(symbol: string, timeframe: Timeframe): Promise<import("./entities/market-candle.entity").MarketCandle | null>;
}
