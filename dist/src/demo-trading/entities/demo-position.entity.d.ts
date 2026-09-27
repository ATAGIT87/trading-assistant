import { Timeframe } from "../../assets/enums/timeframe.enum";
export type DemoPositionSide = "BUY";
export type DemoPositionStatus = "OPEN" | "WIN" | "LOSS";
export type DemoPositionMode = "APPROVED" | "EXPERIMENTAL";
export declare class DemoPosition {
    id: number;
    symbol: string;
    strategyVersion: string | null;
    mode: DemoPositionMode;
    timeframe: Timeframe;
    side: DemoPositionSide;
    entry: number;
    quantity: number;
    investedAmount: number;
    entryFee: number;
    exitFee: number;
    realizedPnlUsdt: number | null;
    stopLoss: number;
    takeProfit: number;
    riskReward: number | null;
    status: DemoPositionStatus;
    openedAt: Date;
    closedAt: Date | null;
    exitPrice: number | null;
    resultR: number | null;
    exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
}
