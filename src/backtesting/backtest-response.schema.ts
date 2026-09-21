import { z } from "zod";

export const BacktestResponseSchema = z.object({
  totalTrades: z.number().int().nonnegative(),
  winningTrades: z.number().int().nonnegative(),
  losingTrades: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(100),
  totalR: z.number(),
  expectancyR: z.number(),

  grossTotalR: z.number(),
  totalFeeR: z.number(),
  totalSlippageR: z.number(),
  totalCostR: z.number(),

  training: z
    .object({
      totalTrades: z.number().int().nonnegative(),
    })
    .passthrough(),

  test: z
    .object({
      totalTrades: z.number().int().nonnegative(),
    })
    .passthrough(),

  trades: z.array(
    z
      .object({
        result: z.enum(["WIN", "LOSS", "OPEN"]),
        resultR: z.number().nullable(),
      })
      .passthrough(),
  ),
});

export type BacktestResponse = z.infer<typeof BacktestResponseSchema>;
