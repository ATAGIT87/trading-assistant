import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestingService } from "./backtesting.service";
export declare class BacktestingController {
    private readonly backtestingService;
    constructor(backtestingService: BacktestingService);
    runBacktest(symbol: string, timeframe: Timeframe, _useHigherTimeframeConfirmation?: string, _excludeHighAdxSell?: string): Promise<{
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
