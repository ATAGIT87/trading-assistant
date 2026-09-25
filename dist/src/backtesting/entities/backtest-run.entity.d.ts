import { Timeframe } from "../../assets/enums/timeframe.enum";
import type { BacktestResult } from "../interfaces/backtest-result.interface";
export declare class BacktestRun {
    id: number;
    symbol: string;
    timeframe: Timeframe;
    strategyVersion: string;
    result: BacktestResult;
    createdAt: Date;
}
