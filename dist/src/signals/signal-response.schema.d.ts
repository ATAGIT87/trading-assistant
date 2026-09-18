import { z } from "zod";
export declare const SignalResponseSchema: z.ZodObject<{
    action: z.ZodEnum<{
        BUY: "BUY";
        SELL: "SELL";
        WAIT: "WAIT";
        NO_TRADE: "NO_TRADE";
    }>;
    confidence: z.ZodNumber;
    entryPrice: z.ZodNumber;
    stopLoss: z.ZodNullable<z.ZodNumber>;
    takeProfit: z.ZodNullable<z.ZodNumber>;
    isStrongSetup: z.ZodBoolean;
    trend: z.ZodEnum<{
        BULLISH: "BULLISH";
        BEARISH: "BEARISH";
        NEUTRAL: "NEUTRAL";
    }>;
    rsi: z.ZodNumber;
    adx: z.ZodNumber;
    rsiStatus: z.ZodString;
    marketCondition: z.ZodString;
    candleTime: z.ZodCoercedDate<unknown>;
    reason: z.ZodString;
}, z.core.$strip>;
export type SignalResponse = z.infer<typeof SignalResponseSchema>;
