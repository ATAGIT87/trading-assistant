import { Injectable } from "@nestjs/common";

import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { RiskManagerService } from "../risk/risk-manager.service";
import { TradingSignal } from "./signal.types";

export type StrategyV2Trend =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export const STRATEGY_VERSION = "v2-baseline";
const MIN_ADX = 15;

@Injectable()
export class StrategyV2Service {
  constructor(
    private readonly indicatorsService: IndicatorsService,
    private readonly riskManagerService: RiskManagerService,
  ) {}

  evaluateCandles(
    candles: MarketCandle[],
    startIndex = 0,
    endIndex = candles.length,
    _higherTimeframeTrend?: StrategyV2Trend,
  ): TradingSignal {
    const safeStart = Math.max(0, startIndex);

    const safeEnd = Math.min(
      Math.max(safeStart, endIndex),
      candles.length,
    );

    const relevantCandles = candles.slice(
      safeStart,
      safeEnd,
    );

    if (relevantCandles.length === 0) {
      return this.buildSignal(
        "NO_TRADE",
        0,
        "No completed candles are available.",
        relevantCandles,
      );
    }

    const latest =
      relevantCandles[
        relevantCandles.length - 1
      ];

    const close = Number(latest.close);

    if (relevantCandles.length < 50) {
      return this.buildSignal(
        "NO_TRADE",
        close,
        "Not enough completed candles for the baseline strategy.",
        relevantCandles,
      );
    }

    const closes =
      relevantCandles.map((candle) =>
        Number(candle.close),
      );

    const ema20 =
      this.indicatorsService.calculateEma(
        closes,
        20,
      );

    const ema50 =
      this.indicatorsService.calculateEma(
        closes,
        50,
      );

    const sma20 =
      this.indicatorsService.calculateSma(
        closes,
        20,
      );

    const sma50 =
      this.indicatorsService.calculateSma(
        closes,
        50,
      );

    const adx =
      this.calculateAdx14(
        relevantCandles,
      );

    const atr14 =
      this.calculateAtr14(
        relevantCandles,
      );

    const rsi =
      this.calculateRsi(
        relevantCandles,
      );

    if (
      ema20 === null ||
      ema50 === null ||
      sma20 === null ||
      sma50 === null
    ) {
      return this.buildSignal(
        "NO_TRADE",
        close,
        "Required moving averages are not available.",
        relevantCandles,
        "NEUTRAL",
        rsi,
        adx,
        atr14,
      );
    }

    const trend = this.getTrend(relevantCandles) ?? "NEUTRAL";
    const bullishTrend = trend === "BULLISH";
    const bearishTrend = trend === "BEARISH";

    if (
      _higherTimeframeTrend !== undefined &&
      (_higherTimeframeTrend === "NEUTRAL" ||
        _higherTimeframeTrend !== trend)
    ) {
      return this.buildSignal(
        "NO_TRADE",
        close,
        `NO_TRADE: higher timeframe confirmation failed (primary=${trend}, higher=${_higherTimeframeTrend}).`,
        relevantCandles,
        trend,
        rsi,
        adx,
        atr14,
      );
    }

    if (adx < MIN_ADX) {
      return this.buildSignal(
        "NO_TRADE",
        close,
        `NO_TRADE: ADX14 ${adx.toFixed(2)} is below the minimum ${MIN_ADX}.`,
        relevantCandles,
        trend,
        rsi,
        adx,
        atr14,
      );
    }

    const momentum =
      this.calculateMomentum(
        relevantCandles,
      );

    const previousSwingHigh =
      this.findPreviousSwingHigh(
        relevantCandles,
      );

    const previousSwingLow =
      this.findPreviousSwingLow(
        relevantCandles,
      );

    const bullishBreakout =
      previousSwingHigh !== null &&
      close > previousSwingHigh;

    const bearishBreakout =
      previousSwingLow !== null &&
      close < previousSwingLow;

    if (
      bullishTrend &&
      momentum > 0 &&
      bullishBreakout
    ) {
      return this.buildSignal(
        "BUY",
        close,
        "Baseline BUY: bullish trend, positive momentum and breakout above the previous swing high.",
        relevantCandles,
        trend,
        rsi,
        adx,
        atr14,
      );
    }

    if (
      bearishTrend &&
      momentum < 0 &&
      bearishBreakout
    ) {
      return this.buildSignal(
        "SELL",
        close,
        "Baseline SELL: bearish trend, negative momentum and breakout below the previous swing low.",
        relevantCandles,
        trend,
        rsi,
        adx,
        atr14,
      );
    }

    return this.buildSignal(
      "NO_TRADE",
      close,
      this.buildNoTradeReason(
        trend,
        momentum,
        bullishBreakout,
        bearishBreakout,
      ),
      relevantCandles,
      trend,
      rsi,
      adx,
      atr14,
    );
  }

  getTrend(candles: MarketCandle[]): StrategyV2Trend | null {
    if (candles.length < 50) {
      return null;
    }

    const closes = candles.map((candle) => Number(candle.close));
    const close = closes[closes.length - 1];
    const ema20 = this.indicatorsService.calculateEma(closes, 20);
    const ema50 = this.indicatorsService.calculateEma(closes, 50);
    const sma20 = this.indicatorsService.calculateSma(closes, 20);
    const sma50 = this.indicatorsService.calculateSma(closes, 50);

    if (ema20 === null || ema50 === null || sma20 === null || sma50 === null) {
      return null;
    }

    if (close > ema20 && ema20 > ema50 && sma20 > sma50) {
      return "BULLISH";
    }

    if (close < ema20 && ema20 < ema50 && sma20 < sma50) {
      return "BEARISH";
    }

    return "NEUTRAL";
  }

  private calculateMomentum(
    candles: MarketCandle[],
  ): number {
    if (candles.length < 4) {
      return 0;
    }

    const latest =
      Number(
        candles[candles.length - 1].close,
      );

    const previous =
      Number(
        candles[candles.length - 4].close,
      );

    return latest - previous;
  }

  private findPreviousSwingHigh(
    candles: MarketCandle[],
  ): number | null {
    if (candles.length < 6) {
      return null;
    }

    for (
      let index = candles.length - 2;
      index >= 4;
      index--
    ) {
      const high =
        Number(candles[index].high);

      const previousHighs =
        candles
          .slice(index - 4, index)
          .map((candle) =>
            Number(candle.high),
          );

      if (
        high >= Math.max(...previousHighs)
      ) {
        return high;
      }
    }

    return null;
  }

  private findPreviousSwingLow(
    candles: MarketCandle[],
  ): number | null {
    if (candles.length < 6) {
      return null;
    }

    for (
      let index = candles.length - 2;
      index >= 4;
      index--
    ) {
      const low =
        Number(candles[index].low);

      const previousLows =
        candles
          .slice(index - 4, index)
          .map((candle) =>
            Number(candle.low),
          );

      if (
        low <= Math.min(...previousLows)
      ) {
        return low;
      }
    }

    return null;
  }

  private calculateAdx14(
    candles: MarketCandle[],
  ): number {
    if (candles.length < 14) {
      return 0;
    }

    return (
      this.indicatorsService.calculateAdxFromCandles(
        candles.map((candle) => ({
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        })),
        14,
      ) ?? 0
    );
  }

  private calculateAtr14(
    candles: MarketCandle[],
  ): number {
    if (candles.length < 2) {
      return 0;
    }

    const trueRanges =
      this.indicatorsService.calculateTrueRangesFromCandles(
        candles.map((candle) => ({
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        })),
      );

    const atr =
      this.indicatorsService.calculateAtr(
        trueRanges,
        14,
      );

    if (
      atr !== null &&
      atr > 0
    ) {
      return atr;
    }

    const ranges =
      candles.map(
        (candle) =>
          Number(candle.high) -
          Number(candle.low),
      );

    const averageRange =
      ranges.reduce(
        (sum, value) => sum + value,
        0,
      ) / ranges.length;

    return averageRange > 0
      ? averageRange
      : 0.01;
  }

  private calculateRsi(
    candles: MarketCandle[],
  ): number {
    const closes =
      candles.map((candle) =>
        Number(candle.close),
      );

    return (
      this.indicatorsService.calculateRsiFromPrices(
        closes,
        14,
      ) ?? 50
    );
  }

  private buildNoTradeReason(
    trend: StrategyV2Trend,
    momentum: number,
    bullishBreakout: boolean,
    bearishBreakout: boolean,
  ): string {
    if (trend === "NEUTRAL") {
      return "NO_TRADE: trend is neutral.";
    }

    if (
      trend === "BULLISH" &&
      momentum <= 0
    ) {
      return "NO_TRADE: bullish trend without positive momentum.";
    }

    if (
      trend === "BEARISH" &&
      momentum >= 0
    ) {
      return "NO_TRADE: bearish trend without negative momentum.";
    }

    if (
      trend === "BULLISH" &&
      !bullishBreakout
    ) {
      return "NO_TRADE: bullish trend and momentum are present, but price has not broken the previous swing high.";
    }

    if (
      trend === "BEARISH" &&
      !bearishBreakout
    ) {
      return "NO_TRADE: bearish trend and momentum are present, but price has not broken the previous swing low.";
    }

    return "NO_TRADE: baseline entry conditions are not satisfied.";
  }

  private buildSignal(
    action: TradingSignal["action"],
    entryPrice: number,
    reason: string,
    candles: MarketCandle[],
    trend: StrategyV2Trend = "NEUTRAL",
    rsi = 50,
    adx = 0,
    atr = 0,
  ): TradingSignal {
    const candleTime =
      candles[candles.length - 1]?.time ??
      new Date();

    const rsiStatus =
      rsi < 30
        ? "OVERSOLD"
        : rsi > 70
          ? "OVERBOUGHT"
          : "NEUTRAL";

    const marketCondition =
      trend === "BULLISH"
        ? "BULLISH_CONTINUATION"
        : trend === "BEARISH"
          ? "BEARISH_CONTINUATION"
          : "NEUTRAL";

    const riskLevels =
      this.riskManagerService.calculateLevels(
        action,
        entryPrice,
        candles,
        atr,
      );

    const validTrade =
      (action === "BUY" ||
        action === "SELL") &&
      riskLevels.stopLoss !== null &&
      riskLevels.takeProfit !== null &&
      riskLevels.riskReward !== null &&
      riskLevels.riskReward >= 1;

    if (
      (action === "BUY" ||
        action === "SELL") &&
      !validTrade
    ) {
      return {
        action: "NO_TRADE",
        confidence: 0,
        entryPrice,
        stopLoss: null,
        takeProfit: null,
        isStrongSetup: false,
        trend,
        rsi,
        adx,
        rsiStatus,
        marketCondition,
        candleTime,
        reason:
          "NO_TRADE: risk/reward conditions are not satisfied.",
      };
    }

    return {
      action,
      confidence:
        action === "BUY" ||
        action === "SELL"
          ? 80
          : 0,
      entryPrice,
      stopLoss:
        riskLevels.stopLoss,
      takeProfit:
        riskLevels.takeProfit,
      isStrongSetup:
        action === "BUY" ||
        action === "SELL",
      trend,
      rsi,
      adx,
      rsiStatus,
      marketCondition,
      candleTime,
      reason,
    };
  }
}
