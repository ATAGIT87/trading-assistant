import { Timeframe } from "./enums/timeframe.enum";
export declare const timeframeDurationMs: Record<Timeframe, number>;
export declare const higherTimeframeByTimeframe: Partial<Record<Timeframe, Timeframe>>;
export declare function getHigherTimeframe(timeframe: Timeframe): Timeframe | null;
export declare function isTimeframeBoundary(timeframe: Timeframe, now: Date): boolean;
