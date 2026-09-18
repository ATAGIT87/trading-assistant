"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalResponseSchema = void 0;
const zod_1 = require("zod");
exports.SignalResponseSchema = zod_1.z.object({
    action: zod_1.z.enum(["BUY", "SELL", "WAIT", "NO_TRADE"]),
    confidence: zod_1.z.number(),
    entryPrice: zod_1.z.number(),
    stopLoss: zod_1.z.number().nullable(),
    takeProfit: zod_1.z.number().nullable(),
    isStrongSetup: zod_1.z.boolean(),
    trend: zod_1.z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
    rsi: zod_1.z.number(),
    adx: zod_1.z.number(),
    rsiStatus: zod_1.z.string(),
    marketCondition: zod_1.z.string(),
    candleTime: zod_1.z.coerce.date(),
    reason: zod_1.z.string(),
});
//# sourceMappingURL=signal-response.schema.js.map