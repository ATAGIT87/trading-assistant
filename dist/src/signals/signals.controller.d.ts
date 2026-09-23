import { SignalsService } from "./signals.service";
import { SignalStorageService } from "./signal-storage.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class SignalsController {
    private readonly signalsService;
    private readonly signalStorageService;
    constructor(signalsService: SignalsService, signalStorageService: SignalStorageService);
    getSignalHistory(symbol: string, timeframe: Timeframe): Promise<import("./entities/signal.entity").Signal[]>;
    getLatestSignal(symbol: string, timeframe: Timeframe): Promise<import("./entities/signal.entity").Signal | null>;
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
    generateSignal(symbol: string, timeframe: Timeframe, period: number): Promise<{
        action: "BUY" | "SELL" | "WAIT" | "NO_TRADE";
        confidence: number;
        entryPrice: number;
        stopLoss: number | null;
        takeProfit: number | null;
        isStrongSetup: boolean;
        trend: "BULLISH" | "BEARISH" | "NEUTRAL";
        rsi: number;
        adx: number;
        rsiStatus: string;
        marketCondition: string;
        candleTime: Date;
        reason: string;
    }>;
}
