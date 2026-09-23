import { Timeframe } from "../../assets/enums/timeframe.enum";
export type DemoPositionSide = "BUY" | "SELL";
export type DemoPositionStatus = "OPEN" | "WIN" | "LOSS";
export declare class DemoPosition {
    id: number;
    symbol: string;
    timeframe: Timeframe;
    side: DemoPositionSide;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: number | null;
    status: DemoPositionStatus;
    openedAt: Date;
    closedAt: Date | null;
    exitPrice: number | null;
    resultR: number | null;
}
