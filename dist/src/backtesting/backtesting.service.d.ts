import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketDataService } from "../market-data/market-data.service";
import { StrategyRegistryService } from "../signals/strategy-registry.service";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { BacktestSummary } from "./interfaces/backtest-result.interface";
import { BacktestRun } from "./entities/backtest-run.entity";
import { PortfolioBacktestResult } from "./interfaces/portfolio-backtest-result.interface";
import { WalkForwardPortfolioResult } from "./interfaces/walk-forward-result.interface";
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly strategyRegistry;
    private readonly configService;
    private readonly backtestRunRepository;
    private readonly feeRate;
    private readonly slippageRate;
    constructor(marketDataService: MarketDataService, strategyRegistry: StrategyRegistryService, configService: ConfigService, backtestRunRepository: Repository<BacktestRun>);
    private getNumericConfigValue;
    private toNumericCandles;
    run(symbol: string, timeframe: Timeframe, strategyVersion?: string, includeProtectedHoldout?: boolean): Promise<BacktestResult>;
    runPortfolio(timeframe: Timeframe, strategyVersion?: string): Promise<PortfolioBacktestResult>;
    runWalkForwardPortfolio(timeframe: Timeframe, strategyVersion?: string): Promise<WalkForwardPortfolioResult>;
    private runWalkForwardSymbol;
    private simulateWalkForwardWindow;
    private calculateGrossR;
    findRuns(symbol: string, timeframe: Timeframe): Promise<BacktestRun[]>;
    getReadiness(symbol: string, timeframe: Timeframe): Promise<{
        isReady: boolean;
        strategyVersion: string;
        reason: string;
        evaluationScope?: undefined;
        validation?: undefined;
        test?: undefined;
        protectedHoldout?: undefined;
    } | {
        isReady: boolean;
        strategyVersion: string;
        evaluationScope: "PORTFOLIO";
        validation: {
            totalTrades: number;
            totalR: number;
            expectancyR: number;
            contributingSymbols: number;
        };
        test: {
            totalTrades: number;
            totalR: number;
            expectancyR: number;
            contributingSymbols: number;
        };
        protectedHoldout: {
            totalTrades: number;
            totalR: number;
            expectancyR: number;
            contributingSymbols: number;
        };
        reason: string;
    } | {
        isReady: boolean;
        strategyVersion: null;
        reason: string;
        runId?: undefined;
        validation?: undefined;
        test?: undefined;
    } | {
        strategyVersion: string;
        isReady: boolean;
        reason: string;
        runId: number;
        validation: BacktestSummary;
        test: BacktestSummary;
        protectedHoldout: BacktestSummary;
    } | {
        isReady: boolean;
        strategyVersion: string;
        runId: number | undefined;
        validation: BacktestSummary | undefined;
        test: BacktestSummary | undefined;
        reason: string;
    }>;
    private getPortfolioReadiness;
    private getMaxPortfolioPositions;
    private evaluateRunReadiness;
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
