import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { timeframeDurationMs } from "../../../src/production/assets/timeframe.utils";
import { IndicatorsService } from "../indicators/indicators.service";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { TradingSignal } from "../../../src/production/signals/signal.types";
import { HourlySetupStructureResearchStrategy } from "./hourly-setup-structure-research.strategy";
import { TechnicalTrendEngine } from "./technical-trend-engine";

/** One causal diagnosis-to-entry pipeline, independently versioned for paper observation. */
@Injectable()
export class HourlyIntegratedSpotResearchStrategy extends HourlySetupStructureResearchStrategy {
  override readonly version: string = "research-hourly-integrated-spot-v7";
  override readonly minimumHigherTimeframeHistory = 55;
  constructor(
    private readonly integratedIndicators: IndicatorsService,
    risk: RiskManagerService,
    config: ConfigService,
    private readonly trendEngine: TechnicalTrendEngine,
  ) {
    super(integratedIndicators, risk, config);
  }

  override getTrend(candles: MarketCandle[]): TradingSignal["trend"] | null {
    if (!candles.length) return null;
    const asOf = new Date(
      Math.max(...candles.map((c) => +c.time)) +
        timeframeDurationMs[Timeframe.FOUR_HOURS],
    );
    const diagnosis = this.trendEngine.analyze(
      candles,
      Timeframe.FOUR_HOURS,
      asOf,
    );
    return diagnosis.status === "OK" ? diagnosis.direction : null;
  }

  override evaluateCandles(
    candles: MarketCandle[],
    start?: number,
    end?: number,
    higherTimeframeTrend?: TradingSignal["trend"],
    symbol?: string,
  ): TradingSignal {
    if (!candles.length)
      return super.evaluateCandles(
        candles,
        start,
        end,
        higherTimeframeTrend,
        symbol,
      );
    const asOf = new Date(
      Math.max(...candles.map((c) => +c.time)) +
        timeframeDurationMs[Timeframe.ONE_HOUR],
    );
    const diagnosis = this.trendEngine.analyze(
      candles,
      Timeframe.ONE_HOUR,
      asOf,
    );
    const block = (reason: string): TradingSignal => ({
      action: "NO_TRADE",
      confidence: 0,
      confidenceBasis: "NOT_ESTIMATED",
      entryPrice: Number(candles.at(-1)!.close),
      stopLoss: null,
      takeProfit: null,
      isStrongSetup: false,
      trend: "NEUTRAL",
      rsi: 50,
      adx: 0,
      rsiStatus: "NEUTRAL",
      marketCondition: "NEUTRAL",
      candleTime: candles.at(-1)!.time,
      reason,
      strategyVersion: this.version,
    });
    if (diagnosis.status !== "OK")
      return block(`Integrated analysis blocked: ${diagnosis.reason}`);
    const eligibleTrend =
      diagnosis.direction === "BULLISH" && diagnosis.phase === "ADVANCING";
    const signal = eligibleTrend
      ? super.evaluateCandles(candles, start, end, higherTimeframeTrend, symbol)
      : block(
          `NO_TRADE: hourly trend is ${diagnosis.direction}/${diagnosis.phase}; wait for bullish recovery.`,
        );
    return {
      ...signal,
      strategyVersion: this.version,
      trend: diagnosis.direction,
      rsi: diagnosis.indicators.rsi,
      adx: diagnosis.indicators.adx,
      rsiStatus: this.integratedIndicators.classifyRsi(
        diagnosis.indicators.rsi,
      ),
      marketCondition: this.integratedIndicators.determineMarketCondition(
        diagnosis.direction,
        this.integratedIndicators.classifyRsi(diagnosis.indicators.rsi),
      ),
      analysis: {
        modelVersion: this.trendEngine.version,
        strategyVersion: this.version,
        decisionAt: diagnosis.decisionAt,
        hourlyDirection: diagnosis.direction,
        higherDirection: higherTimeframeTrend ?? null,
        phase: diagnosis.phase,
        strength: diagnosis.strength,
        structure: diagnosis.structure.state,
        indicators: diagnosis.indicators,
        evidence: diagnosis.evidence,
        entryAccepted: signal.action === "BUY",
      },
      reason:
        signal.action === "BUY"
          ? "RESEARCH: aligned technical-trend-v1 diagnosis, confirmed pullback and cost-valid setup structural levels."
          : signal.reason,
    };
  }
}
