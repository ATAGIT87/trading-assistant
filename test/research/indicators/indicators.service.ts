import { Injectable } from "@nestjs/common";

@Injectable()
export class IndicatorsService {
  calculateEma(values: number[], period: number): number | null {
    if (
      !Number.isInteger(period) ||
      period <= 0 ||
      values.length < period ||
      !values.every(Number.isFinite)
    ) {
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

  calculateRsi(averageGain: number, averageLoss: number): number {
    // With no movement in either direction, report a neutral RSI.
    if (averageGain === 0 && averageLoss === 0) {
      return 50;
    }
    if (averageLoss === 0) {
      return 100;
    }

    const rs = averageGain / averageLoss;

    return 100 - 100 / (1 + rs);
  }

  calculateRsiFromPrices(values: number[], period: number): number | null {
    if (
      !Number.isInteger(period) ||
      period <= 0 ||
      values.length <= period ||
      !values.every(Number.isFinite)
    ) {
      return null;
    }

    const changes = this.calculatePriceChanges(values);

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 0; i < period; i++) {
      const change = changes[i];

      if (change > 0) {
        gainSum += change;
      } else {
        lossSum += Math.abs(change);
      }
    }

    let averageGain = gainSum / period;
    let averageLoss = lossSum / period;

    for (let i = period; i < changes.length; i++) {
      const change = changes[i];

      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      averageGain = (averageGain * (period - 1) + gain) / period;

      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }

    return this.calculateRsi(averageGain, averageLoss);
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
    if (
      !Number.isInteger(period) ||
      trueRanges.length < period ||
      period <= 0 ||
      !trueRanges.every((value) => Number.isFinite(value) && value >= 0)
    ) {
      return null;
    }

    let atr = 0;

    for (let i = 0; i < period; i++) {
      atr += trueRanges[i];
    }

    atr /= period;

    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
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

  calculateDirectionalMovement(
    currentHigh: number,
    currentLow: number,
    previousHigh: number,
    previousLow: number,
  ): { plusDm: number; minusDm: number } {
    const upwardMove = currentHigh - previousHigh;
    const downwardMove = previousLow - currentLow;

    const plusDm = upwardMove > downwardMove && upwardMove > 0 ? upwardMove : 0;

    const minusDm =
      downwardMove > upwardMove && downwardMove > 0 ? downwardMove : 0;

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

    if (
      !Number.isInteger(period) ||
      trueRanges.length !== plusDm.length ||
      trueRanges.length !== minusDm.length ||
      ![...trueRanges, ...plusDm, ...minusDm].every(
        (v) => Number.isFinite(v) && v >= 0,
      )
    )
      return null;
    let trSmoothed = trueRanges.slice(0, period).reduce((sum, v) => sum + v, 0);
    let plusSmoothed = plusDm.slice(0, period).reduce((sum, v) => sum + v, 0);
    let minusSmoothed = minusDm.slice(0, period).reduce((sum, v) => sum + v, 0);
    for (let i = period; i < trueRanges.length; i++) {
      trSmoothed = trSmoothed - trSmoothed / period + trueRanges[i];
      plusSmoothed = plusSmoothed - plusSmoothed / period + plusDm[i];
      minusSmoothed = minusSmoothed - minusSmoothed / period + minusDm[i];
    }
    return trSmoothed === 0
      ? { plusDi: 0, minusDi: 0 }
      : {
          plusDi: (plusSmoothed / trSmoothed) * 100,
          minusDi: (minusSmoothed / trSmoothed) * 100,
        };
  }

  calculateDirectionalIndex(plusDi: number, minusDi: number): number | null {
    const sum = plusDi + minusDi;

    if (sum === 0) {
      return null;
    }

    return (Math.abs(plusDi - minusDi) / sum) * 100;
  }
  calculateAdx(dxValues: number[], period: number): number | null {
    if (
      !Number.isInteger(period) ||
      period <= 0 ||
      dxValues.length < period ||
      !dxValues.every((value) => Number.isFinite(value) && value >= 0)
    ) {
      return null;
    }

    let adx =
      dxValues.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

    for (let i = period; i < dxValues.length; i++) {
      adx = (adx * (period - 1) + dxValues[i]) / period;
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
    if (
      !Number.isInteger(period) ||
      period <= 0 ||
      candles.length < period * 2
    ) {
      return null;
    }

    const trueRanges = this.calculateTrueRangesFromCandles(candles);

    const directionalMovements = this.calculateDirectionalMovements(candles);

    if (
      trueRanges.length < period ||
      directionalMovements.plusDm.length < period ||
      directionalMovements.minusDm.length < period
    ) {
      return null;
    }

    let trSmoothed = 0;
    let plusDmSmoothed = 0;
    let minusDmSmoothed = 0;

    for (let i = 0; i < period; i++) {
      trSmoothed += trueRanges[i];
      plusDmSmoothed += directionalMovements.plusDm[i];
      minusDmSmoothed += directionalMovements.minusDm[i];
    }

    const dxValues: number[] = [];

    const calculateDx = () => {
      if (trSmoothed === 0) {
        return null;
      }

      const plusDi = (plusDmSmoothed / trSmoothed) * 100;

      const minusDi = (minusDmSmoothed / trSmoothed) * 100;

      return this.calculateDirectionalIndex(plusDi, minusDi);
    };

    const firstDx = calculateDx();

    if (firstDx !== null) {
      dxValues.push(firstDx);
    }

    for (let i = period; i < trueRanges.length; i++) {
      trSmoothed = trSmoothed - trSmoothed / period + trueRanges[i];

      plusDmSmoothed =
        plusDmSmoothed -
        plusDmSmoothed / period +
        directionalMovements.plusDm[i];

      minusDmSmoothed =
        minusDmSmoothed -
        minusDmSmoothed / period +
        directionalMovements.minusDm[i];

      const dx = calculateDx();

      if (dx !== null) {
        dxValues.push(dx);
      }
    }

    return this.calculateAdx(dxValues, period);
  }
}
