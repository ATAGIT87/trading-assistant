"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.higherTimeframeByTimeframe = exports.timeframeDurationMs = void 0;
exports.getHigherTimeframe = getHigherTimeframe;
exports.isTimeframeBoundary = isTimeframeBoundary;
const timeframe_enum_1 = require("./enums/timeframe.enum");
exports.timeframeDurationMs = {
    [timeframe_enum_1.Timeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
    [timeframe_enum_1.Timeframe.ONE_HOUR]: 60 * 60 * 1000,
    [timeframe_enum_1.Timeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
    [timeframe_enum_1.Timeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
};
exports.higherTimeframeByTimeframe = {
    [timeframe_enum_1.Timeframe.FIFTEEN_MINUTES]: timeframe_enum_1.Timeframe.ONE_HOUR,
    [timeframe_enum_1.Timeframe.ONE_HOUR]: timeframe_enum_1.Timeframe.FOUR_HOURS,
    [timeframe_enum_1.Timeframe.FOUR_HOURS]: timeframe_enum_1.Timeframe.ONE_DAY,
};
function getHigherTimeframe(timeframe) {
    return exports.higherTimeframeByTimeframe[timeframe] ?? null;
}
function isTimeframeBoundary(timeframe, now) {
    const minutes = now.getUTCMinutes();
    const hours = now.getUTCHours();
    switch (timeframe) {
        case timeframe_enum_1.Timeframe.FIFTEEN_MINUTES:
            return minutes % 15 === 0;
        case timeframe_enum_1.Timeframe.ONE_HOUR:
            return minutes === 0;
        case timeframe_enum_1.Timeframe.FOUR_HOURS:
            return minutes === 0 && hours % 4 === 0;
        case timeframe_enum_1.Timeframe.ONE_DAY:
            return minutes === 0 && hours === 0;
    }
}
//# sourceMappingURL=timeframe.utils.js.map