import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { MarketDataService } from "./market-data.service";
export declare class MarketDataController {
    private readonly marketDataService;
    constructor(marketDataService: MarketDataService);
    createCandle(dto: CreateMarketCandleDto): Promise<import("./entities/market-candle.entity").MarketCandle>;
}
