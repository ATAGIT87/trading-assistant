import { SignalsService } from "./signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class SignalsController {
    private readonly signalsService;
    constructor(signalsService: SignalsService);
    getSignalHistory(symbol: string, timeframe: Timeframe): Promise<import("./entities/signal.entity").Signal[]>;
    getLatestSignal(symbol: string, timeframe: Timeframe): Promise<import("./entities/signal.entity").Signal | null>;
    generateSignal(symbol: string, timeframe: Timeframe, period: string): Promise<import("./signal.types").TradingSignal | null>;
}
