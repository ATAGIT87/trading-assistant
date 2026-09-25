import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestingService } from "./backtesting.service";
export declare class BacktestingController {
    private readonly backtestingService;
    constructor(backtestingService: BacktestingService);
    getHistory(symbol: string, timeframe: Timeframe): Promise<import("./entities/backtest-run.entity").BacktestRun[]>;
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
    runBacktest(symbol: string, timeframe: Timeframe): Promise<{
        strategyVersion: string;
        higherTimeframeConfirmation: boolean;
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
        test: {
            [x: string]: unknown;
            totalTrades: number;
        };
        trades: {
            [x: string]: unknown;
            result: "WIN" | "LOSS" | "OPEN";
            resultR: number | null;
        }[];
    }>;
}
