import { z } from "zod";
export declare const BacktestResponseSchema: any;
export type BacktestResponse = z.infer<typeof BacktestResponseSchema>;
