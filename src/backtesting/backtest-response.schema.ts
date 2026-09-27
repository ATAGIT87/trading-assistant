import { z } from "zod";

export const BacktestResponseSchema = z.object({
  strategyVersion: z.string(),
  researchContext: z.object({
    engineVersion: z.string(),
    codeRevision: z.string(),
    feeRate: z.number().nonnegative(),
    slippageRate: z.number().nonnegative(),
    protectedHoldoutStart: z.string(),
    primaryCandleRange: z.object({
      firstCandleTime: z.coerce.date().nullable(),
      lastCompletedCandleTime: z.coerce.date().nullable(),
    }),
  }),
  dataQuality: z.object({
    primary: z
      .object({
        totalCandles: z.number().int().nonnegative(),
        completedCandles: z.number().int().nonnegative(),
        invalidOhlcCandles: z.number().int().nonnegative(),
        gapCount: z.number().int().nonnegative(),
        isUsableForResearch: z.boolean(),
      })
      .passthrough(),
    higherTimeframe: z
      .object({
        totalCandles: z.number().int().nonnegative(),
        invalidOhlcCandles: z.number().int().nonnegative(),
        gapCount: z.number().int().nonnegative(),
        isUsableForResearch: z.boolean(),
      })
      .passthrough()
      .nullable(),
  }),
  higherTimeframeConfirmation: z.boolean(),
  includesProtectedHoldout: z.boolean(),
  protectedHoldoutDays: z.number().int().nonnegative(),
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

  validation: z
    .object({
      totalTrades: z.number().int().nonnegative(),
    })
    .passthrough(),

  test: z
    .object({
      totalTrades: z.number().int().nonnegative(),
    })
    .passthrough(),

  protectedHoldout: z
    .object({
      totalTrades: z.number().int().nonnegative(),
    })
    .passthrough()
    .nullable(),

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
