import { Timeframe } from "../assets/enums/timeframe.enum";
import { DemoTradingService } from "./demo-trading.service";
export declare class DemoTradingController {
    private readonly demoTradingService;
    constructor(demoTradingService: DemoTradingService);
    openPosition(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: "WAIT" | "NO_TRADE";
        reason: string;
        position: null;
        signal?: undefined;
    } | {
        symbol: string;
        timeframe: Timeframe;
        action: "BUY" | "SELL";
        signal: import("../signals/signal.types").TradingSignal;
        reason: string;
        position: import("./entities/demo-position.entity").DemoPosition;
    }>;
    getOpenPositions(): Promise<{
        openPositions: import("./entities/demo-position.entity").DemoPosition[];
    }>;
    checkOpenPositions(): Promise<{
        checkedAt: Date;
        processed: {
            symbol: string;
            timeframe: Timeframe;
            side: "BUY" | "SELL";
            entry: number;
            stopLoss: number;
            takeProfit: number;
            status: "OPEN" | "WIN" | "LOSS";
            exitPrice: number | null;
            closedAt: Date | null;
            resultR: number | null;
            reason: string;
        }[];
    }>;
    getHistory(): Promise<{
        closedPositions: {
            result: import("./entities/demo-position.entity").DemoPositionStatus;
            entry: number;
            exitPrice: number | null;
            resultR: number | null;
            openedAt: Date;
            closedAt: Date | null;
            symbol: string;
            timeframe: Timeframe;
            side: import("./entities/demo-position.entity").DemoPositionSide;
        }[];
    }>;
}
