import { TradingSignal } from "./signal.types";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import type { MarketDataPort } from "./market-data.port";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { SignalStorageService } from "./signal-storage.service";
import { SignalCalculationService } from "./signal-calculation.service";
import { SignalTimeframeService } from "./signal-timeframe.service";
import { StrategyV2Service } from "./strategy-v2.service";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly indicatorsService;
    private readonly signalStorageService;
    private readonly signalCalculationService;
    private readonly signalTimeframeService;
    private readonly strategyV2Service;
    constructor(marketDataService: MarketDataPort, indicatorsService: IndicatorsService, signalStorageService: SignalStorageService, signalCalculationService: SignalCalculationService, signalTimeframeService: SignalTimeframeService, strategyV2Service: StrategyV2Service);
    generateSignal(symbol: string, timeframe: Timeframe, period: number): Promise<TradingSignal | null>;
    generateSignalFromCandles(symbol: string, timeframe: Timeframe, candles: MarketCandle[], higherTimeframeCandles?: MarketCandle[], useHigherTimeframeConfirmation?: boolean, excludeHighAdxSell?: boolean): Promise<TradingSignal | null>;
    generateSignalV2(symbol: string, timeframe: Timeframe, period: number, higherTimeframeTrend?: TradingSignal["trend"]): Promise<TradingSignal | null>;
    private getCompletedCandles;
    private calculateRiskReward;
    getLiveV2Signal(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: string;
        signalTime: Date;
        entry: null;
        stopLoss: null;
        takeProfit: null;
        riskReward: null;
        reason: string;
        strategyVersion: string;
    } | {
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
    getSignalByCandleTime(symbol: string, timeframe: Timeframe, candleTime: Date): Promise<import("./entities/signal.entity").Signal | null>;
}
