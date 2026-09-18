import { z } from "zod";

export const ScannerResponseSchema = z
  .object({
    action: z.enum(["BUY", "SELL", "WAIT", "NO_TRADE"]),
    confidence: z.coerce.number(),
    entryPrice: z.coerce.number(),
    stopLoss: z.coerce.number().nullable(),
    takeProfit: z.coerce.number().nullable(),
    isStrongSetup: z.boolean(),
    trend: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
    rsi: z.coerce.number(),
    adx: z.coerce.number(),
    marketCondition: z.string(),
    candleTime: z.coerce.date(),
    reason: z.string(),
  })
  .nullable();

export type ScannerResponse = z.infer<typeof ScannerResponseSchema>;