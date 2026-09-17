import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class ScannerService {
    private readonly signalsService;
    constructor(signalsService: SignalsService);
    scan(symbol: string, timeframe: Timeframe, period?: number): Promise<import("../signals/signal.types").TradingSignal | null>;
    scheduledScan(): Promise<void>;
}
