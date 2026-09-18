import { TradingSignal } from "./signal.types";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import type { MarketDataPort } from "./market-data.port";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { Repository } from "typeorm";
import { Signal } from "./entities/signal.entity";
export declare class SignalsService {
    private readonly marketDataService;
    private readonly indicatorsService;
    private readonly signalRepository;
    constructor(marketDataService: MarketDataPort, indicatorsService: IndicatorsService, signalRepository: Repository<Signal>);
    determineAction(higherTimeframeTrend: TradingSignal["trend"] | null, trend: TradingSignal["trend"], marketCondition: TradingSignal["marketCondition"], isStrongSetup: boolean, adx: number, atr: number): TradingSignal["action"];
    createSignal(trend: TradingSignal["trend"], entryPrice: number, atr: number, priceVsSma: "ABOVE" | "BELOW" | "EQUAL", priceVsEma: "ABOVE" | "BELOW" | "EQUAL", rsi: number, adx: number, rsiStatus: TradingSignal["rsiStatus"], marketCondition: TradingSignal["marketCondition"], higherTimeframeTrend: TradingSignal["trend"] | null, candleTime: Date): TradingSignal;
    generateSignal(symbol: string, timeframe: Timeframe, period: number): Promise<TradingSignal | null>;
    calculateConfidence(trendScore: number, averageAlignmentScore: number, rsiScore: number, marketConditionScore: number, adxScore: number): number;
    calculateStopLoss(action: "BUY" | "SELL", entryPrice: number, atr: number): number;
    calculateTakeProfit(action: "BUY" | "SELL", entryPrice: number, stopLoss: number, riskRewardRatio: number): number;
    getHigherTimeframeTrend(symbol: string, timeframe: Timeframe, period: number): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null>;
    private getHigherTimeframeTrendFromCandles;
    generateSignalFromCandles(symbol: string, timeframe: Timeframe, candles: MarketCandle[]): Promise<TradingSignal | null>;
    saveSignal(symbol: string, timeframe: Timeframe, signal: TradingSignal): Promise<Signal>;
    getSignalHistory(symbol: string, timeframe: Timeframe): Promise<Signal[]>;
    getLatestSignal(symbol: string, timeframe: Timeframe): Promise<Signal | null>;
    getSignalByCandleTime(symbol: string, timeframe: Timeframe, candleTime: Date): Promise<Signal | null>;
}
