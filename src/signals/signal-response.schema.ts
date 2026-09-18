import { z } from "zod";

export const SignalResponseSchema = z.object({
  action: z.enum(["BUY", "SELL", "WAIT", "NO_TRADE"]),
  confidence: z.number(),
  entryPrice: z.number(),
  stopLoss: z.number().nullable(),
  takeProfit: z.number().nullable(),
  isStrongSetup: z.boolean(),
  trend: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
  rsi: z.number(),
  adx: z.number(),
  rsiStatus: z.string(),
  marketCondition: z.string(),
  candleTime: z.coerce.date(),
  reason: z.string(),
});

export type SignalResponse = z.infer<typeof SignalResponseSchema>;
