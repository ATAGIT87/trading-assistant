import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import type { MarketDataPort } from "./market-data.port";
import { TradingSignal } from "./signal.types";
export declare class SignalTimeframeService {
    private readonly marketDataService;
    private readonly indicatorsService;
    constructor(marketDataService: MarketDataPort, indicatorsService: IndicatorsService);
    getHigherTimeframeTrend(symbol: string, timeframe: Timeframe, period: number): Promise<TradingSignal["trend"] | null>;
    getHigherTimeframeTrendFromCandles(symbol: string, timeframe: Timeframe, until: Date, preloadedCandles?: MarketCandle[]): Promise<TradingSignal["trend"] | null>;
    private getHigherTimeframe;
}
