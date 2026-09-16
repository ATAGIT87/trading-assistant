import { Repository } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { OnModuleInit } from "@nestjs/common";
export declare class MarketDataSeed implements OnModuleInit {
    private readonly marketCandleRepository;
    constructor(marketCandleRepository: Repository<MarketCandle>);
    onModuleInit(): Promise<void>;
    seed(): Promise<void>;
}
