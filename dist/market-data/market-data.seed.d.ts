import { OnModuleInit } from "@nestjs/common";
import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
export declare class MarketDataSeed implements OnModuleInit {
    private readonly marketCandleRepository;
    constructor(marketCandleRepository: Repository<MarketCandle>);
    onModuleInit(): Promise<void>;
    seed(): Promise<void>;
}
