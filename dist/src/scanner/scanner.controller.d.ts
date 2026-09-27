import { ScannerService } from "./scanner.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class ScannerController {
    private readonly scannerService;
    constructor(scannerService: ScannerService);
    scan(symbol: string, timeframe: Timeframe): Promise<{
        action: "BUY" | "SELL" | "WAIT" | "NO_TRADE";
        confidence: number;
        entryPrice: number;
        stopLoss: number | null;
        takeProfit: number | null;
        isStrongSetup: boolean;
        trend: "BULLISH" | "BEARISH" | "NEUTRAL";
        rsi: number;
        adx: number;
        marketCondition: string;
        candleTime: Date;
        reason: string;
    } | null>;
}
