import { Timeframe } from "../assets/enums/timeframe.enum";
import type { MarketDataPort } from "./market-data.port";
import { StrategyV2Service } from "./strategy-v2.service";
import { TradingSignal } from "./signal.types";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly strategyV2Service;
    constructor(marketDataService: MarketDataPort, strategyV2Service: StrategyV2Service);
    generateSignalV2(symbol: string, timeframe: Timeframe, _period: number, higherTimeframeTrend?: TradingSignal["trend"]): Promise<TradingSignal | null>;
    getLiveV2Signal(symbol: string, timeframe: Timeframe): Promise<TradingSignal>;
    private getCompletedCandles;
    private getHigherTimeframeTrend;
}
