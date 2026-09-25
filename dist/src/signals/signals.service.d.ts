import { Timeframe } from "../assets/enums/timeframe.enum";
import type { MarketDataPort } from "./market-data.port";
import { StrategyV2Service } from "./strategy-v2.service";
import { TradingSignal } from "./signal.types";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly strategyV2Service;
    constructor(marketDataService: MarketDataPort, strategyV2Service: StrategyV2Service);
    generateSignalV2(symbol: string, timeframe: Timeframe, _period: number, higherTimeframeTrend?: TradingSignal["trend"]): Promise<TradingSignal | null>;
    getLiveV2Signal(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: import("./signal.types").SignalAction;
        signalTime: Date;
        entry: number | null;
        stopLoss: number | null;
        takeProfit: number | null;
        riskReward: number | null;
        reason: string;
        strategyVersion: string;
    }>;
    getSignalByCandleTime(symbol: string, timeframe: Timeframe, candleTime: Date): Promise<null>;
    private getCompletedCandles;
    private calculateRiskReward;
}
