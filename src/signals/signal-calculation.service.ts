import { Injectable } from "@nestjs/common";

import { IndicatorsService } from "../indicators/indicators.service";
import { TradingSignal } from "./signal.types";

const STRONG_SETUP_THRESHOLD = 75;

@Injectable()
export class SignalCalculationService {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  createSignal(
    trend: TradingSignal["trend"],
    entryPrice: number,
    atr: number,
    priceVsSma: "ABOVE" | "BELOW" | "EQUAL",
    priceVsEma: "ABOVE" | "BELOW" | "EQUAL",
    rsi: number,
    adx: number,
    rsiStatus: TradingSignal["rsiStatus"],
    marketCondition: TradingSignal["marketCondition"],
    higherTimeframeTrend: TradingSignal["trend"] | null,
    candleTime: Date,
  ): TradingSignal {
    const trendScore = this.indicatorsService.calculateTrendScore(trend);

    const averageAlignmentScore =
      this.indicatorsService.calculateAverageAlignmentScore(
        priceVsSma,
        priceVsEma,
      );

    const rsiScore = this.indicatorsService.calculateRsiScore(trend, rsi);

    const marketConditionScore =
      this.indicatorsService.calculateMarketConditionScore(
        trend,
        marketCondition,
      );

    const adxScore = this.indicatorsService.calculateAdxScore(adx);

    const confidence = this.calculateConfidence(
      trendScore,
      averageAlignmentScore,
      rsiScore,
      marketConditionScore,
      adxScore,
    );

    const isStrongSetup = confidence >= STRONG_SETUP_THRESHOLD;

    const action = this.determineAction(
      higherTimeframeTrend,
      trend,
      marketCondition,
      isStrongSetup,
      adx,
      atr,
    );

    let stopLoss: number | null = null;
    let takeProfit: number | null = null;

    if (action === "BUY" || action === "SELL") {
      stopLoss = this.calculateStopLoss(action, entryPrice, atr);

      takeProfit = this.calculateTakeProfit(action, entryPrice, stopLoss, 2);
    }

    return {
      action,
      confidence,
      entryPrice,
      stopLoss,
      takeProfit,
      isStrongSetup,
      trend,
      rsi,
      adx,
      rsiStatus,
      marketCondition,
      candleTime,
      reason:
        action === "BUY"
          ? `Bullish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
          : action === "SELL"
            ? `Bearish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
            : `No valid trading setup. Trend: ${trend}, Higher timeframe trend: ${higherTimeframeTrend ?? "N/A"}, RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`,
    };
  }

  determineAction(
    higherTimeframeTrend: TradingSignal["trend"] | null,
    trend: TradingSignal["trend"],
    marketCondition: TradingSignal["marketCondition"],
    isStrongSetup: boolean,
    adx: number,
    atr: number,
  ): TradingSignal["action"] {
    if (!isStrongSetup) {
      return "NO_TRADE";
    }

    if (trend === "NEUTRAL") {
      return "NO_TRADE";
    }

    if (adx < 25) {
      return "NO_TRADE";
    }

    if (atr <= 0) {
      return "NO_TRADE";
    }

    if (
      higherTimeframeTrend !== null &&
      ((trend === "BULLISH" && higherTimeframeTrend !== "BULLISH") ||
        (trend === "BEARISH" && higherTimeframeTrend !== "BEARISH"))
    ) {
      return "NO_TRADE";
    }

    if (
      (trend === "BULLISH" && marketCondition === "BEARISH_CONTINUATION") ||
      (trend === "BEARISH" && marketCondition === "BULLISH_CONTINUATION")
    ) {
      return "NO_TRADE";
    }

    if (marketCondition === "BULLISH_CONTINUATION") {
      return "BUY";
    }

    if (marketCondition === "BEARISH_CONTINUATION") {
      return "SELL";
    }

    return "WAIT";
  }

  calculateConfidence(
    trendScore: number,
    averageAlignmentScore: number,
    rsiScore: number,
    marketConditionScore: number,
    adxScore: number,
  ): number {
    return Math.min(
      trendScore +
        averageAlignmentScore +
        rsiScore +
        marketConditionScore +
        adxScore,
      100,
    );
  }

  calculateStopLoss(
    action: "BUY" | "SELL",
    entryPrice: number,
    atr: number,
  ): number {
    const stopDistance = 1.5 * atr;

    if (action === "BUY") {
      return entryPrice - stopDistance;
    }

    return entryPrice + stopDistance;
  }

  calculateTakeProfit(
    action: "BUY" | "SELL",
    entryPrice: number,
    stopLoss: number,
    riskRewardRatio: number,
  ): number {
    const risk = Math.abs(entryPrice - stopLoss);

    const reward = risk * riskRewardRatio;

    if (action === "BUY") {
      return entryPrice + reward;
    }

    return entryPrice - reward;
  }
}
