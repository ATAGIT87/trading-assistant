import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
export declare class MarketDataSeed {
    private readonly marketCandleRepository;
    constructor(marketCandleRepository: Repository<MarketCandle>);
    seed(): Promise<void>;
}
