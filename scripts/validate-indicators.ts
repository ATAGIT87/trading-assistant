import {
  ADX,
  ATR,
  EMA,
  RSI,
  SMA,
} from "technicalindicators";

import { IndicatorsService } from "../src/indicators/indicators.service";

type Candle = {
  high: number;
  low: number;
  close: number;
};

async function main() {
  const response = await fetch(
    "http://localhost:3000/market-data/candles/ETHUSD/15m",
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Candle[];

  const candles = data.slice(-100);

  if (candles.length < 50) {
    throw new Error(
      `Not enough candles: ${candles.length}`,
    );
  }

  const highs = candles.map(
    (candle) => Number(candle.high),
  );

  const lows = candles.map(
    (candle) => Number(candle.low),
  );

  const closes = candles.map(
    (candle) => Number(candle.close),
  );

  const period = 14;

  const indicatorsService =
    new IndicatorsService();

  const ourSma =
    indicatorsService.calculateSma(
      closes,
      period,
    );

  const ourEma =
    indicatorsService.calculateEma(
      closes,
      period,
    );

  const ourRsi =
    indicatorsService.calculateRsiFromPrices(
      closes,
      period,
    );

  const ourAtr =
    indicatorsService.calculateAtr(
      indicatorsService.calculateTrueRangesFromCandles(
        candles,
      ),
      period,
    );

  const ourAdx =
    indicatorsService.calculateAdxFromCandles(
      candles,
      period,
    );

  const referenceSma =
    SMA.calculate({
      period,
      values: closes,
    }).at(-1) ?? null;

  const referenceEma =
    EMA.calculate({
      period,
      values: closes,
    }).at(-1) ?? null;

  const referenceRsi =
    RSI.calculate({
      period,
      values: closes,
    }).at(-1) ?? null;

  const referenceAtr =
    ATR.calculate({
      period,
      high: highs,
      low: lows,
      close: closes,
    }).at(-1) ?? null;

  const referenceAdx =
    ADX.calculate({
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
  console.log(
    "difference:",
    ourSma !== null && referenceSma !== null
      ? ourSma - referenceSma
      : null,
  );

  console.log("\nEMA");
  console.log("ours:      ", ourEma);
  console.log("reference: ", referenceEma);
  console.log(
    "difference:",
    ourEma !== null && referenceEma !== null
      ? ourEma - referenceEma
      : null,
  );

  console.log("\nRSI");
  console.log("ours:      ", ourRsi);
  console.log("reference: ", referenceRsi);
  console.log(
    "difference:",
    ourRsi !== null && referenceRsi !== null
      ? ourRsi - referenceRsi
      : null,
  );

  console.log("\nATR");
  console.log("ours:      ", ourAtr);
  console.log("reference: ", referenceAtr);
  console.log(
    "difference:",
    ourAtr !== null && referenceAtr !== null
      ? ourAtr - referenceAtr
      : null,
  );

  console.log("\nADX");
  console.log("ours:      ", ourAdx);
  console.log("reference: ", referenceAdx);
  console.log(
    "difference:",
    ourAdx !== null && referenceAdx !== null
      ? ourAdx - referenceAdx
      : null,
  );

  console.log("\n====================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});