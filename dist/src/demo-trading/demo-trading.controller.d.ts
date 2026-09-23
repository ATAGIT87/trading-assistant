import { Timeframe } from "../assets/enums/timeframe.enum";
import { DemoTradingService } from "./demo-trading.service";
export declare class DemoTradingController {
    private readonly demoTradingService;
    constructor(demoTradingService: DemoTradingService);
    openPosition(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: string;
        reason: string;
        position: null;
        signal?: undefined;
    } | {
        symbol: string;
        timeframe: Timeframe;
        action: string;
        signal: {
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
            action: import("../signals/signal.types").SignalAction;
            signalTime: Date;
            entry: number | null;
            stopLoss: number | null;
            takeProfit: number | null;
            riskReward: number | null;
            reason: string;
            strategyVersion: string;
        };
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
