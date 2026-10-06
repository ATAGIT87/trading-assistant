import { Injectable } from "@nestjs/common";
import { RiskManagerService } from "../risk/risk-manager.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";
import {
  EMA_RSI_STRATEGY_VERSION,
  MarketAnalysis,
} from "./ccxt/analyze-market";

/** The user's EMA50/RSI14 entry rule. Legacy strategies are historical policies only. */
@Injectable()
export class EmaRsiSpotStrategy {
  readonly version = EMA_RSI_STRATEGY_VERSION;
  readonly minimumTradesPerSegment = 0;
  readonly minimumContributingSymbols = 0;

  constructor(private readonly risk: RiskManagerService) {}

  signalFromAnalysis(result: MarketAnalysis): TradingSignal {
    const priceAbove =
      result.candle !== undefined &&
      result.ema50 !== undefined &&
      result.candle.close > result.ema50;
    const valid = result.candle !== undefined && result.ema50 !== undefined;
    const direction = !valid
      ? "NEUTRAL"
      : priceAbove
        ? "BULLISH"
        : result.candle!.close < result.ema50!
          ? "BEARISH"
          : "NEUTRAL";
    const levels =
      result.shouldBuy && result.candle && result.closedHistory && result.atr14
        ? this.risk.calculateLevels(
            "BUY",
            result.candle.close,
            result.closedHistory.map((c) => ({
              ...c,
              time: new Date(c.timestamp),
            })) as unknown as MarketCandle[],
            result.atr14,
          )
        : { stopLoss: null, takeProfit: null };
    const indicators: Record<string, number> = {};
    for (const key of [
      "ema50",
      "rsi14",
      "previousRsi14",
      "beforePreviousRsi14",
      "atr14",
    ] as const)
      if (result[key] !== undefined) indicators[key] = result[key]!;
    if (result.candle) indicators.close = result.candle.close;
    return {
      strategyVersion: this.version,
      action: result.shouldBuy ? "BUY" : "NO_TRADE",
      confidence: 0,
      confidenceBasis: "NOT_ESTIMATED",
      entryPrice: result.candle?.close ?? 0,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      minimumRewardRisk: 1,
      minimumNetRewardRisk: 0.5,
      preserveTakeProfit: true,
      profitProtection: false,
      isStrongSetup: false,
      trend: direction,
      rsi: result.rsi14 ?? 50,
      adx: 0,
      rsiStatus:
        (result.rsi14 ?? 50) < 35
          ? "OVERSOLD"
          : (result.rsi14 ?? 50) > 70
            ? "OVERBOUGHT"
            : "NEUTRAL",
      marketCondition: result.shouldBuy ? "POSSIBLE_REVERSAL" : "NEUTRAL",
      candleTime: new Date(result.candle?.timestamp ?? 0),
      reason: result.reason,
      currentPrice: result.currentPrice,
      analysis: {
        modelVersion: this.version,
        strategyVersion: this.version,
        decisionAt: new Date(
          result.candle ? result.candle.timestamp + 3_600_000 : 0,
        ),
        hourlyDirection: direction,
        higherDirection: null,
        phase: result.shouldBuy ? "OVERSOLD_RECOVERY" : "WAITING",
        strength: "NOT_ESTIMATED",
        structure: "EMA50_RSI14",
        indicators,
        evidence: {
          priceAboveEma50: priceAbove,
          entryPatternMatched: result.shouldBuy,
        },
        entryAccepted: result.shouldBuy,
      },
    };
  }
}
