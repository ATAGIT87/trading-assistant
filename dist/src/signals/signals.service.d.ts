import { Timeframe } from "../assets/enums/timeframe.enum";
import type { MarketDataPort } from "./market-data.port";
import { StrategyRegistryService } from "./strategy-registry.service";
import { TradingSignal } from "./signal.types";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly strategyRegistry;
    constructor(marketDataService: MarketDataPort, strategyRegistry: StrategyRegistryService);
    generateSignalV2(symbol: string, timeframe: Timeframe, _period: number, higherTimeframeTrend?: TradingSignal["trend"]): Promise<TradingSignal | null>;
    getLiveV2Signal(symbol: string, timeframe: Timeframe): Promise<TradingSignal>;
    private getCompletedCandles;
    private getHigherTimeframeTrend;
    private noTradeSignal;
}
