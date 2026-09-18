import { SignalsService } from "./signals.service";
import { SignalStorageService } from "./signal-storage.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class SignalsController {
    private readonly signalsService;
    private readonly signalStorageService;
    constructor(signalsService: SignalsService, signalStorageService: SignalStorageService);
    getSignalHistory(symbol: string, timeframe: Timeframe): Promise<import("./entities/signal.entity").Signal[]>;
    getLatestSignal(symbol: string, timeframe: Timeframe): Promise<import("./entities/signal.entity").Signal | null>;
    generateSignal(symbol: string, timeframe: Timeframe, period: string): Promise<import("./signal.types").TradingSignal | null>;
}
