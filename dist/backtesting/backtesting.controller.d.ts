import { BacktestingService } from "./backtesting.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class BacktestingController {
    private readonly backtestingService;
    constructor(backtestingService: BacktestingService);
    run(symbol: string, timeframe: Timeframe): Promise<import("./backtesting.service").BacktestResult>;
}
