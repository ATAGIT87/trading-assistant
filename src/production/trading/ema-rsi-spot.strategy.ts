import { Injectable } from "@nestjs/common";
import { RiskManagerService } from "../risk/risk-manager.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";
import { SPOT_STRATEGY_VERSION, MarketAnalysis } from "./ccxt/analyze-market";

/** Buy-only daily macro trend and bullish 4h EMA pullback, without an RSI entry condition. */
@Injectable()
export class EmaRsiSpotStrategy {
  readonly version = SPOT_STRATEGY_VERSION;
  readonly minimumTradesPerSegment = 30;
  readonly minimumContributingSymbols = 3;

  constructor(private readonly risk: RiskManagerService) {}

  signalFromAnalysis(result: MarketAnalysis): TradingSignal {
    const priceAbove =
      result.candle !== undefined &&
      result.ema200 !== undefined &&
      result.macroBullish === true &&
      result.candle.close > result.ema200;
    const valid = result.candle !== undefined && result.ema200 !== undefined;
    const direction = !valid
      ? "NEUTRAL"
      : priceAbove
        ? "BULLISH"
        : result.candle!.close < result.ema200!
          ? "BEARISH"
          : "NEUTRAL";
    const levels =
      result.shouldBuy && result.candle && result.closedHistory && result.atr14
        ? this.risk.calculateLevels(
            result.candle.close,
            result.closedHistory.map((c) => ({
              ...c,
              time: new Date(c.timestamp),
            })) as unknown as MarketCandle[],
            result.atr14,
          )
        : { stopLoss: null, takeProfit: null };
    const indicators: Record<string, number> = {};
    for (const key of ["ema50", "ema20", "ema200", "atr14"] as const)
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
      // Preserve the structural stop; maintain the planned 2R from the actual
      // passive entry instead of stretching the target when the quote falls.
      preserveTakeProfit: false,
      executionPolicy: "MAKER_ONLY",
      stopExecutionPolicy: "MARKET_STOP",
      isStrongSetup: false,
      trend: direction,
      marketCondition: result.shouldBuy ? "BULLISH_CONTINUATION" : "NEUTRAL",
      candleTime: new Date(result.candle?.timestamp ?? 0),
      reason: result.reason,
      currentPrice: result.currentPrice,
      analysis: {
        modelVersion: this.version,
        strategyVersion: this.version,
        decisionAt: new Date(
          result.candle ? result.candle.timestamp + 14_400_000 : 0,
        ),
        entryDirection: direction,
        higherDirection:
          result.macroBullish === undefined
            ? null
            : result.macroBullish
              ? "BULLISH"
              : "BEARISH",
        phase: result.shouldBuy ? "TREND_PULLBACK" : "WAITING",
        strength: "NOT_ESTIMATED",
        structure: "DAILY_EMA200_WITH_4H_EMA20_OR_EMA50_PULLBACK",
        indicators,
        evidence: {
          priceAboveEma200: priceAbove,
          macroTrendBullish: result.macroBullish === true,
          entryPatternMatched: result.shouldBuy,
          pullbackTo20: result.pullbackTo20 === true,
          pullbackTo50: result.pullbackTo50 === true,
        },
        entryAccepted: result.shouldBuy,
      },
    };
  }
}
