import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestingService } from "./backtesting.service";
export declare class BacktestingController {
    private readonly backtestingService;
    constructor(backtestingService: BacktestingService);
    getHistory(symbol: string, timeframe: Timeframe): Promise<import("./entities/backtest-run.entity").BacktestRun[]>;
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
        validation: import("./interfaces/backtest-result.interface").BacktestSummary;
        test: import("./interfaces/backtest-result.interface").BacktestSummary;
        protectedHoldout: import("./interfaces/backtest-result.interface").BacktestSummary;
    } | {
        isReady: boolean;
        strategyVersion: string;
        runId: number | undefined;
        validation: import("./interfaces/backtest-result.interface").BacktestSummary | undefined;
        test: import("./interfaces/backtest-result.interface").BacktestSummary | undefined;
        reason: string;
    }>;
    compareLatestRuns(symbol: string, timeframe: Timeframe, baselineVersion?: string, candidateVersion?: string): Promise<{
        baseline: import("./entities/backtest-run.entity").BacktestRun;
        candidate: import("./entities/backtest-run.entity").BacktestRun;
        delta: {
            totalR: number;
            expectancyR: number;
            winRate: number;
            testTotalR: number;
            testExpectancyR: number;
        };
    } | null>;
    runPortfolioBacktest(timeframe: Timeframe, strategyVersion?: string): Promise<import("./interfaces/portfolio-backtest-result.interface").PortfolioBacktestResult>;
    runWalkForwardPortfolio(timeframe: Timeframe, strategyVersion?: string): Promise<import("./interfaces/walk-forward-result.interface").WalkForwardPortfolioResult>;
    runBacktest(symbol: string, timeframe: Timeframe, strategyVersion?: string, includeHoldout?: string): Promise<{
        strategyVersion: string;
        researchContext: {
            engineVersion: string;
            codeRevision: string;
            feeRate: number;
            slippageRate: number;
            protectedHoldoutStart: string;
            primaryCandleRange: {
                firstCandleTime: Date | null;
                lastCompletedCandleTime: Date | null;
            };
        };
        dataQuality: {
            primary: {
                [x: string]: unknown;
                totalCandles: number;
                completedCandles: number;
                invalidOhlcCandles: number;
                gapCount: number;
                isUsableForResearch: boolean;
            };
            higherTimeframe: {
                [x: string]: unknown;
                totalCandles: number;
                invalidOhlcCandles: number;
                gapCount: number;
                isUsableForResearch: boolean;
            } | null;
        };
        higherTimeframeConfirmation: boolean;
        includesProtectedHoldout: boolean;
        protectedHoldoutDays: number;
        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        totalR: number;
        expectancyR: number;
        grossTotalR: number;
        totalFeeR: number;
        totalSlippageR: number;
        totalCostR: number;
        training: {
            [x: string]: unknown;
            totalTrades: number;
        };
        validation: {
            [x: string]: unknown;
            totalTrades: number;
        };
        test: {
            [x: string]: unknown;
            totalTrades: number;
        };
        protectedHoldout: {
            [x: string]: unknown;
            totalTrades: number;
        } | null;
        trades: {
            [x: string]: unknown;
            result: "WIN" | "LOSS" | "OPEN";
            resultR: number | null;
        }[];
    }>;
}
