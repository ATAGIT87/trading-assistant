import { z } from "zod";
export declare const BacktestResponseSchema: z.ZodObject<{
    strategyVersion: z.ZodString;
    higherTimeframeConfirmation: z.ZodBoolean;
    totalTrades: z.ZodNumber;
    winningTrades: z.ZodNumber;
    losingTrades: z.ZodNumber;
    winRate: z.ZodNumber;
    totalR: z.ZodNumber;
    expectancyR: z.ZodNumber;
    grossTotalR: z.ZodNumber;
    totalFeeR: z.ZodNumber;
    totalSlippageR: z.ZodNumber;
    totalCostR: z.ZodNumber;
    training: z.ZodObject<{
        totalTrades: z.ZodNumber;
    }, z.core.$loose>;
    test: z.ZodObject<{
        totalTrades: z.ZodNumber;
    }, z.core.$loose>;
    trades: z.ZodArray<z.ZodObject<{
        result: z.ZodEnum<{
            WIN: "WIN";
            LOSS: "LOSS";
            OPEN: "OPEN";
        }>;
        resultR: z.ZodNullable<z.ZodNumber>;
    }, z.core.$loose>>;
}, z.core.$strip>;
export type BacktestResponse = z.infer<typeof BacktestResponseSchema>;
