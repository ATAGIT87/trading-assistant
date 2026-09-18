"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestResponseSchema = void 0;
const zod_1 = require("zod");
exports.BacktestResponseSchema = zod_1.z.object({
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
    test: zod_1.z
        .object({
        totalTrades: zod_1.z.number().int().nonnegative(),
    })
        .passthrough(),
    trades: zod_1.z.array(zod_1.z
        .object({
        result: zod_1.z.enum(["WIN", "LOSS", "OPEN"]),
        resultR: zod_1.z.number().nullable(),
    })
        .passthrough()),
});
//# sourceMappingURL=backtest-response.schema.js.map