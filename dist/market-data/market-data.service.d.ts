import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
export declare class MarketDataService {
    private readonly marketCandleRepository;
    constructor(marketCandleRepository: Repository<MarketCandle>);
    createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle>;
}
