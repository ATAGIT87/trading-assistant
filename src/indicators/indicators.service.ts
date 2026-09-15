import { Injectable } from "@nestjs/common";
import { MarketCandle } from "../market-data/entities/market-candle.entity";

@Injectable()
export class IndicatorsService {
  calculateSma(values: number[], period: number): number | null {
    if (values.length < period) {
      return null;
    }

    const recentValues = values.slice(-period);

    const sum = recentValues.reduce((total, value) => total + value, 0);

    return sum / period;
  }

  calculateSmaFromCandles(
    candles: MarketCandle[],
    period: number,
  ): number | null {
    const closes = candles.map((candle) => Number(candle.close));

    return this.calculateSma(closes, period);
  }

  calculateEma(values: number[], period: number): number | null {
    if (values.length < period) {
      return null;
    }

    const initialValues = values.slice(0, period);

    let ema = initialValues.reduce((sum, value) => sum + value, 0) / period;

    const multiplier = 2 / (period + 1);

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  calculatePriceChanges(values: number[]): number[] {
    const changes: number[] = [];

    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }

    return changes;
  }
  calculateGainsAndLosses(changes: number[]): {
    gains: number[];
    losses: number[];
  } {
    const gains: number[] = [];
    const losses: number[] = [];

    for (const change of changes) {
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    return {
      gains,
      losses,
    };
  }
  calculateAverage(values: number[], period: number): number | null {
    if (values.length < period) {
      return null;
    }

    const recentValues = values.slice(-period);

    const sum = recentValues.reduce((total, value) => total + value, 0);

    return sum / period;
  }

  calculateRsi(averageGain: number, averageLoss: number): number {
    if (averageLoss === 0) {
      return 100;
    }

    const rs = averageGain / averageLoss;

    return 100 - 100 / (1 + rs);
  }

  calculateRsiFromPrices(values: number[], period: number): number | null {
    if (values.length <= period) {
      return null;
    }

    const changes = this.calculatePriceChanges(values);

    const { gains, losses } = this.calculateGainsAndLosses(changes);

    const averageGain = this.calculateAverage(gains, period);

    const averageLoss = this.calculateAverage(losses, period);

    if (averageGain === null || averageLoss === null) {
      return null;
    }

    return this.calculateRsi(averageGain, averageLoss);
  }
  calculateRsiFromCandles(
    candles: MarketCandle[],
    period: number,
  ): number | null {
    const closes = candles.map((candle) => Number(candle.close));

    return this.calculateRsiFromPrices(closes, period);
  }

  comparePriceToAverage(
    price: number,
    average: number,
  ): "ABOVE" | "BELOW" | "EQUAL" {
    if (price > average) {
      return "ABOVE";
    }

    if (price < average) {
      return "BELOW";
    }

    return "EQUAL";
  }

  compareSmaToEma(
    sma: number,
    ema: number,
  ): "SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" {
    if (sma > ema) {
      return "SMA_ABOVE_EMA";
    }

    if (sma < ema) {
      return "SMA_BELOW_EMA";
    }

    return "SMA_EQUAL_EMA";
  }

  determineTrend(
    priceVsSma: "ABOVE" | "BELOW" | "EQUAL",
    priceVsEma: "ABOVE" | "BELOW" | "EQUAL",
  ): "BULLISH" | "BEARISH" | "NEUTRAL" {
    if (priceVsSma === "ABOVE" && priceVsEma === "ABOVE") {
      return "BULLISH";
    }

    if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
      return "BEARISH";
    }

    return "NEUTRAL";
  }

  classifyRsi(rsi: number): "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" {
    if (rsi < 30) {
      return "OVERSOLD";
    }

    if (rsi > 70) {
      return "OVERBOUGHT";
    }

    return "NEUTRAL";
  }
  determineMarketCondition(
    trend: "BULLISH" | "BEARISH" | "NEUTRAL",
    rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL",
  ):
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL" {
    if (trend === "BEARISH" && rsiStatus === "OVERSOLD") {
      return "POSSIBLE_REVERSAL";
    }

    if (trend === "BEARISH" && rsiStatus === "NEUTRAL") {
      return "BEARISH_CONTINUATION";
    }

    if (trend === "BULLISH" && rsiStatus === "OVERBOUGHT") {
      return "POSSIBLE_REVERSAL";
    }

    if (trend === "BULLISH" && rsiStatus === "NEUTRAL") {
      return "BULLISH_CONTINUATION";
    }

    return "NEUTRAL";
  }

  calculateTrendScore(trend: "BULLISH" | "BEARISH" | "NEUTRAL"): number {
    if (trend === "BULLISH" || trend === "BEARISH") {
      return 40;
    }

    return 0;
  }

  calculateAverageAlignmentScore(
    priceVsSma: "ABOVE" | "BELOW" | "EQUAL",
    priceVsEma: "ABOVE" | "BELOW" | "EQUAL",
  ): number {
    if (priceVsSma === "ABOVE" && priceVsEma === "ABOVE") {
      return 30;
    }

    if (priceVsSma === "BELOW" && priceVsEma === "BELOW") {
      return 30;
    }

    if (priceVsSma === "EQUAL" || priceVsEma === "EQUAL") {
      return 15;
    }

    return 0;
  }

  calculateRsiScore(
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  rsi: number,
): number {
  if (trend === 'NEUTRAL') {
    return 10;
  }

  if (trend === 'BULLISH') {
    if (rsi > 50) {
      return 20;
    }

    if (rsi >= 30) {
      return 10;
    }

    return 0;
  }

  if (rsi < 50) {
    return 20;
  }

  if (rsi <= 70) {
    return 10;
  }

  return 0;
}

  calculateTrueRange(
    currentHigh: number,
    currentLow: number,
    previousClose: number,
  ): number {
    return Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - previousClose),
      Math.abs(currentLow - previousClose),
    );
  }

  calculateAtr(trueRanges: number[], period: number): number | null {
    if (trueRanges.length < period || period <= 0) {
      return null;
    }

    const recentTrueRanges = trueRanges.slice(-period);

    const sum = recentTrueRanges.reduce(
      (total, trueRange) => total + trueRange,
      0,
    );

    return sum / period;
  }

  calculateTrueRangesFromCandles(
    candles: {
      high: number;
      low: number;
      close: number;
    }[],
  ): number[] {
    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const currentCandle = candles[i];
      const previousCandle = candles[i - 1];

      const trueRange = this.calculateTrueRange(
        currentCandle.high,
        currentCandle.low,
        previousCandle.close,
      );

      trueRanges.push(trueRange);
    }

    return trueRanges;
  }
calculateMarketConditionScore(
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  marketCondition:
    | 'POSSIBLE_REVERSAL'
    | 'BEARISH_CONTINUATION'
    | 'BULLISH_CONTINUATION'
    | 'NEUTRAL',
): number {
  if (
    trend === 'BULLISH' &&
    marketCondition === 'BULLISH_CONTINUATION'
  ) {
    return 10;
  }

  if (
    trend === 'BEARISH' &&
    marketCondition === 'BEARISH_CONTINUATION'
  ) {
    return 10;
  }

  return 0;
}

calculateDirectionalMovement(
  currentHigh: number,
  currentLow: number,
  previousHigh: number,
  previousLow: number,
): { plusDm: number; minusDm: number } {
  const upwardMove = currentHigh - previousHigh;
  const downwardMove = previousLow - currentLow;

  const plusDm =
    upwardMove > downwardMove && upwardMove > 0
      ? upwardMove
      : 0;

  const minusDm =
    downwardMove > upwardMove && downwardMove > 0
      ? downwardMove
      : 0;

  return {
    plusDm,
    minusDm,
  };
}
calculateDirectionalMovements(
  candles: {
    high: number;
    low: number;
  }[],
): { plusDm: number[]; minusDm: number[] } {
  const plusDm: number[] = [];
  const minusDm: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const movement = this.calculateDirectionalMovement(
      candles[i].high,
      candles[i].low,
      candles[i - 1].high,
      candles[i - 1].low,
    );

    plusDm.push(movement.plusDm);
    minusDm.push(movement.minusDm);
  }

  return {
    plusDm,
    minusDm,
  };
}
calculateDirectionalIndicators(
  trueRanges: number[],
  plusDm: number[],
  minusDm: number[],
  period: number,
): { plusDi: number; minusDi: number } | null {
  if (
    period <= 0 ||
    trueRanges.length < period ||
    plusDm.length < period ||
    minusDm.length < period
  ) {
    return null;
  }

  const recentTrueRanges = trueRanges.slice(-period);
  const recentPlusDm = plusDm.slice(-period);
  const recentMinusDm = minusDm.slice(-period);

  const trAverage =
    recentTrueRanges.reduce((sum, value) => sum + value, 0) / period;

  if (trAverage === 0) {
    return null;
  }

  const plusDmAverage =
    recentPlusDm.reduce((sum, value) => sum + value, 0) / period;

  const minusDmAverage =
    recentMinusDm.reduce((sum, value) => sum + value, 0) / period;

  return {
    plusDi: (plusDmAverage / trAverage) * 100,
    minusDi: (minusDmAverage / trAverage) * 100,
  };
}
calculateDirectionalIndex(
  plusDi: number,
  minusDi: number,
): number | null {
  const sum = plusDi + minusDi;

  if (sum === 0) {
    return null;
  }

  return (
    (Math.abs(plusDi - minusDi) / sum) * 100
  );
}
calculateAdx(
  dxValues: number[],
  period: number,
): number | null {
  if (period <= 0 || dxValues.length < period) {
    return null;
  }

  let adx =
    dxValues
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < dxValues.length; i++) {
    adx =
      ((adx * (period - 1)) + dxValues[i]) / period;
  }

  return adx;
}
calculateAdxFromCandles(
  candles: {
    high: number;
    low: number;
    close: number;
  }[],
  period: number,
): number | null {
  if (candles.length < period * 2) {
    return null;
  }

  const trueRanges =
    this.calculateTrueRangesFromCandles(candles);

  const directionalMovements =
    this.calculateDirectionalMovements(candles);

  const dxValues: number[] = [];

  for (let i = period; i <= trueRanges.length; i++) {
    const trSlice = trueRanges.slice(i - period, i);
    const plusDmSlice =
      directionalMovements.plusDm.slice(i - period, i);
    const minusDmSlice =
      directionalMovements.minusDm.slice(i - period, i);

    const di = this.calculateDirectionalIndicators(
      trSlice,
      plusDmSlice,
      minusDmSlice,
      period,
    );

    if (!di) {
      continue;
    }

    const dx = this.calculateDirectionalIndex(
      di.plusDi,
      di.minusDi,
    );

    if (dx !== null) {
      dxValues.push(dx);
    }
  }

  return this.calculateAdx(dxValues, period);
}

calculateAdxScore(adx: number): number {
  if (adx >= 25) {
    return 5;
  }

  return 0;
}

}
