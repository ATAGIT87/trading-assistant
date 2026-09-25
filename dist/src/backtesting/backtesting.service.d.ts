import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketDataService } from "../market-data/market-data.service";
import { StrategyV2Service } from "../signals/strategy-v2.service";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { BacktestRun } from "./entities/backtest-run.entity";
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly strategyV2Service;
    private readonly configService;
    private readonly backtestRunRepository;
    private readonly feeRate;
    private readonly slippageRate;
    constructor(marketDataService: MarketDataService, strategyV2Service: StrategyV2Service, configService: ConfigService, backtestRunRepository: Repository<BacktestRun>);
    private getNumericConfigValue;
    run(symbol: string, timeframe: Timeframe): Promise<BacktestResult>;
    findRuns(symbol: string, timeframe: Timeframe): Promise<BacktestRun[]>;
    compareLatestRuns(symbol: string, timeframe: Timeframe, baselineVersion: string, candidateVersion: string): Promise<{
        baseline: BacktestRun;
        candidate: BacktestRun;
        delta: {
            totalR: number;
            expectancyR: number;
            winRate: number;
            testTotalR: number;
            testExpectancyR: number;
        };
    } | null>;
    private saveRun;
}
