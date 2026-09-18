import { z } from "zod";
export declare const ScannerResponseSchema: z.ZodNullable<z.ZodObject<{
    action: z.ZodEnum<{
        BUY: "BUY";
        SELL: "SELL";
        WAIT: "WAIT";
        NO_TRADE: "NO_TRADE";
    }>;
    confidence: z.ZodCoercedNumber<unknown>;
    entryPrice: z.ZodCoercedNumber<unknown>;
    stopLoss: z.ZodNullable<z.ZodCoercedNumber<unknown>>;
    takeProfit: z.ZodNullable<z.ZodCoercedNumber<unknown>>;
    isStrongSetup: z.ZodBoolean;
    trend: z.ZodEnum<{
        BULLISH: "BULLISH";
        BEARISH: "BEARISH";
        NEUTRAL: "NEUTRAL";
    }>;
    rsi: z.ZodCoercedNumber<unknown>;
    adx: z.ZodCoercedNumber<unknown>;
    marketCondition: z.ZodString;
    candleTime: z.ZodCoercedDate<unknown>;
    reason: z.ZodString;
}, z.core.$strip>>;
export type ScannerResponse = z.infer<typeof ScannerResponseSchema>;
