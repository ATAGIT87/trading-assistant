import { TradingSignal } from "./signal.types";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import type { MarketDataPort } from "./market-data.port";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { SignalStorageService } from "./signal-storage.service";
import { SignalCalculationService } from "./signal-calculation.service";
import { SignalTimeframeService } from "./signal-timeframe.service";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly indicatorsService;
    private readonly signalStorageService;
    private readonly signalCalculationService;
    private readonly signalTimeframeService;
    constructor(marketDataService: MarketDataPort, indicatorsService: IndicatorsService, signalStorageService: SignalStorageService, signalCalculationService: SignalCalculationService, signalTimeframeService: SignalTimeframeService);
    generateSignal(symbol: string, timeframe: Timeframe, period: number): Promise<TradingSignal | null>;
    generateSignalFromCandles(symbol: string, timeframe: Timeframe, candles: MarketCandle[], higherTimeframeCandles?: MarketCandle[]): Promise<TradingSignal | null>;
    getSignalByCandleTime(symbol: string, timeframe: Timeframe, candleTime: Date): Promise<import("./entities/signal.entity").Signal | null>;
}
