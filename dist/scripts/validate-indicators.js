"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const technicalindicators_1 = require("technicalindicators");
const indicators_service_1 = require("../src/indicators/indicators.service");
async function main() {
    const response = await fetch("http://localhost:3000/market-data/candles/ETHUSD/15m");
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json());
    const candles = data.slice(-100);
    if (candles.length < 50) {
        throw new Error(`Not enough candles: ${candles.length}`);
    }
    const highs = candles.map((candle) => Number(candle.high));
    const lows = candles.map((candle) => Number(candle.low));
    const closes = candles.map((candle) => Number(candle.close));
    const period = 14;
    const indicatorsService = new indicators_service_1.IndicatorsService();
    const ourSma = indicatorsService.calculateSma(closes, period);
    const ourEma = indicatorsService.calculateEma(closes, period);
    const ourRsi = indicatorsService.calculateRsiFromPrices(closes, period);
    const ourAtr = indicatorsService.calculateAtr(indicatorsService.calculateTrueRangesFromCandles(candles), period);
    const ourAdx = indicatorsService.calculateAdxFromCandles(candles, period);
    const referenceSma = technicalindicators_1.SMA.calculate({
        period,
        values: closes,
    }).at(-1) ?? null;
    const referenceEma = technicalindicators_1.EMA.calculate({
        period,
        values: closes,
    }).at(-1) ?? null;
    const referenceRsi = technicalindicators_1.RSI.calculate({
        period,
        values: closes,
    }).at(-1) ?? null;
    const referenceAtr = technicalindicators_1.ATR.calculate({
        period,
        high: highs,
        low: lows,
        close: closes,
    }).at(-1) ?? null;
    const referenceAdx = technicalindicators_1.ADX.calculate({
        period,
        high: highs,
        low: lows,
        close: closes,
    }).at(-1)?.adx ?? null;
    console.log("\nINDICATOR VALIDATION");
    console.log("====================");
    console.log("Candles:", candles.length);
    console.log("\nSMA");
    console.log("ours:      ", ourSma);
    console.log("reference: ", referenceSma);
    console.log("difference:", ourSma !== null && referenceSma !== null
        ? ourSma - referenceSma
        : null);
    console.log("\nEMA");
    console.log("ours:      ", ourEma);
    console.log("reference: ", referenceEma);
    console.log("difference:", ourEma !== null && referenceEma !== null
        ? ourEma - referenceEma
        : null);
    console.log("\nRSI");
    console.log("ours:      ", ourRsi);
    console.log("reference: ", referenceRsi);
    console.log("difference:", ourRsi !== null && referenceRsi !== null
        ? ourRsi - referenceRsi
        : null);
    console.log("\nATR");
    console.log("ours:      ", ourAtr);
    console.log("reference: ", referenceAtr);
    console.log("difference:", ourAtr !== null && referenceAtr !== null
        ? ourAtr - referenceAtr
        : null);
    console.log("\nADX");
    console.log("ours:      ", ourAdx);
    console.log("reference: ", referenceAdx);
    console.log("difference:", ourAdx !== null && referenceAdx !== null
        ? ourAdx - referenceAdx
        : null);
    console.log("\n====================\n");
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=validate-indicators.js.map