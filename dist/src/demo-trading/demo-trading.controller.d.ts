import { Timeframe } from "../assets/enums/timeframe.enum";
import { DemoTradingService } from "./demo-trading.service";
export declare class DemoTradingController {
    private readonly demoTradingService;
    constructor(demoTradingService: DemoTradingService);
    openPosition(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: "SELL" | "WAIT" | "NO_TRADE";
        reason: string;
        position: null;
        signal?: undefined;
    } | {
        symbol: string;
        timeframe: Timeframe;
        action: "BUY";
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
            side: "BUY";
            mode: import("./entities/demo-position.entity").DemoPosition["mode"];
            entry: number;
            stopLoss: number;
            takeProfit: number;
            status: "OPEN" | "WIN" | "LOSS";
            exitPrice: number | null;
            closedAt: Date | null;
            resultR: number | null;
            exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
            reason: string;
        }[];
    }>;
    getHistory(): Promise<{
        closedPositions: {
            result: import("./entities/demo-position.entity").DemoPositionStatus;
            entry: number;
            exitPrice: number | null;
            resultR: number | null;
            exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
            openedAt: Date;
            closedAt: Date | null;
            symbol: string;
            timeframe: Timeframe;
            side: "BUY";
            mode: import("./entities/demo-position.entity").DemoPositionMode;
            strategyVersion: string | null;
        }[];
    }>;
    getSummary(): Promise<{
        openPositions: number;
        completedTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        totalR: number;
        expectancyR: number;
    }>;
}
