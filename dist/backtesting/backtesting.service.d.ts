import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestResult } from "./interfaces/backtest-result.interface";
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly signalsService;
    constructor(marketDataService: MarketDataService, signalsService: SignalsService);
    run(symbol: string, timeframe: Timeframe): Promise<BacktestResult>;
}
