"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestResponseSchema = void 0;
const zod_1 = require("zod");
exports.BacktestResponseSchema = zod_1.z.object({
    strategyVersion: zod_1.z.string(),
    researchContext: zod_1.z.object({
        engineVersion: zod_1.z.string(),
        codeRevision: zod_1.z.string(),
        feeRate: zod_1.z.number().nonnegative(),
        slippageRate: zod_1.z.number().nonnegative(),
        protectedHoldoutStart: zod_1.z.string(),
        primaryCandleRange: zod_1.z.object({
            firstCandleTime: zod_1.z.coerce.date().nullable(),
            lastCompletedCandleTime: zod_1.z.coerce.date().nullable(),
        }),
    }),
    dataQuality: zod_1.z.object({
        primary: zod_1.z
            .object({
            totalCandles: zod_1.z.number().int().nonnegative(),
            completedCandles: zod_1.z.number().int().nonnegative(),
            invalidOhlcCandles: zod_1.z.number().int().nonnegative(),
            gapCount: zod_1.z.number().int().nonnegative(),
            isUsableForResearch: zod_1.z.boolean(),
        })
            .passthrough(),
        higherTimeframe: zod_1.z
            .object({
            totalCandles: zod_1.z.number().int().nonnegative(),
            invalidOhlcCandles: zod_1.z.number().int().nonnegative(),
            gapCount: zod_1.z.number().int().nonnegative(),
            isUsableForResearch: zod_1.z.boolean(),
        })
            .passthrough()
            .nullable(),
    }),
    higherTimeframeConfirmation: zod_1.z.boolean(),
    includesProtectedHoldout: zod_1.z.boolean(),
    protectedHoldoutDays: zod_1.z.number().int().nonnegative(),
    totalTrades: zod_1.z.number().int().nonnegative(),
    winningTrades: zod_1.z.number().int().nonnegative(),
    losingTrades: zod_1.z.number().int().nonnegative(),
    winRate: zod_1.z.number().min(0).max(100),
    totalR: zod_1.z.number(),
    expectancyR: zod_1.z.number(),
    grossTotalR: zod_1.z.number(),
    totalFeeR: zod_1.z.number(),
    totalSlippageR: zod_1.z.number(),
    totalCostR: zod_1.z.number(),
    training: zod_1.z
        .object({
        totalTrades: zod_1.z.number().int().nonnegative(),
    })
        .passthrough(),
    validation: zod_1.z
        .object({
        totalTrades: zod_1.z.number().int().nonnegative(),
    })
        .passthrough(),
    test: zod_1.z
        .object({
        totalTrades: zod_1.z.number().int().nonnegative(),
    })
        .passthrough(),
    protectedHoldout: zod_1.z
        .object({
        totalTrades: zod_1.z.number().int().nonnegative(),
    })
        .passthrough()
        .nullable(),
    trades: zod_1.z.array(zod_1.z
        .object({
        result: zod_1.z.enum(["WIN", "LOSS", "OPEN"]),
        resultR: zod_1.z.number().nullable(),
    })
        .passthrough()),
});
//# sourceMappingURL=backtest-response.schema.js.map