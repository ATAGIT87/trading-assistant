import { BacktestingService } from "./backtesting.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class BacktestingController {
    private readonly backtestingService;
    constructor(backtestingService: BacktestingService);
    runBacktest(symbol: string, timeframe: Timeframe): Promise<import("./backtesting.service").BacktestResult>;
}
