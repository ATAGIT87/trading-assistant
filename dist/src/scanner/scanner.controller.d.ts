import { ScannerService } from "./scanner.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class ScannerController {
    private readonly scannerService;
    constructor(scannerService: ScannerService);
    scan(symbol: string, timeframe: Timeframe): Promise<import("../signals/entities/signal.entity").Signal | import("../signals/signal.types").TradingSignal | null>;
}
