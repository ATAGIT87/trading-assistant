import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { TradingSignal } from "../../../src/production/signals/signal.types";
import { TradingStrategy } from "./trading-strategy.port";
import { hasPositiveNetTarget } from "../../../src/production/trading/trade-execution";
import {
  findConfirmedSwingHighs,
  findNearestResistanceAbove,
  findUnbrokenSwingHighs,
} from "./market-structure";

/**
 * Research-only 4H trend / 1H execution candidate. Four-hour candles are
 * derived exclusively from the persisted closed Kraken hourly candles.
 */
@Injectable()
export class HourlyFourHourVolumeResearchStrategy implements TradingStrategy {
  readonly version: string = "research-hourly-4h-trend-volume-v1";
  readonly minimumHistory = 201;
  readonly minimumHigherTimeframeHistory: number = 50;
  readonly supportedTimeframes = [Timeframe.ONE_HOUR] as const;
  readonly evaluationScope = "PORTFOLIO" as const;
  readonly requiresHigherTimeframeConfirmation = true;
  readonly minimumTradesPerSegment: number = 0;
  readonly minimumContributingSymbols: number = 0;
  readonly maxHoldingCandles: number = 24;
  protected readonly smallProfit: boolean = false;
  protected readonly profitExit: boolean = false;
  protected readonly correctedAnalysis: boolean = false;
  protected readonly setupStructure: boolean = false;

  constructor(
    private readonly indicators: IndicatorsService,
    private readonly risk: RiskManagerService,
    private readonly config: ConfigService = new ConfigService(),
  ) {}

  getTrend(candles: MarketCandle[]): TradingSignal["trend"] | null {
    // 4H EMA-50 represents 200 hours and is available from the present
    // 1H archive. A 4H EMA-200 needs 800 hourly candles and is deferred.
    if (candles.length < 50) return null;
    const closes = candles.map((candle) => Number(candle.close));
    const ema50 = this.indicators.calculateEma(closes, 50);
    if (ema50 === null) return null;
    return closes.at(-1)! > ema50 ? "BULLISH" : "BEARISH";
  }

  evaluateCandles(
    candles: MarketCandle[],
    _start?: number,
    _end?: number,
    higherTimeframeTrend?: TradingSignal["trend"],
    symbol?: string,
  ): TradingSignal {
    const latest = candles.at(-1);
    const no = (reason: string): TradingSignal => ({
      action: "NO_TRADE",
      confidence: 0,
      confidenceBasis: this.correctedAnalysis ? "NOT_ESTIMATED" : undefined,
      entryPrice: latest ? Number(latest.close) : 0,
      stopLoss: null,
      takeProfit: null,
      isStrongSetup: false,
      trend: "NEUTRAL",
      rsi: 50,
      adx: 0,
      rsiStatus: "NEUTRAL",
      marketCondition: "NEUTRAL",
      candleTime: latest?.time ?? new Date(0),
      reason,
    });
    if (
      latest === undefined ||
      candles.length < this.minimumHistory ||
      (symbol !== "BTCEUR" && symbol !== "ETHEUR")
    ) {
      return no(
        "NO_TRADE: 4H/1H research universe or history requirement not met.",
      );
    }
    if (higherTimeframeTrend !== "BULLISH") {
      return no("NO_TRADE: 4H trend is not bullish.");
    }

    const closes = candles.map((candle) => Number(candle.close));
    const ema20 = this.indicators.calculateEma(closes, 20);
    const previousEma20 = this.indicators.calculateEma(closes.slice(0, -1), 20);
    const rsi = this.indicators.calculateRsiFromPrices(closes, 14);
    const previousRsi = this.indicators.calculateRsiFromPrices(
      closes.slice(0, -1),
      14,
    );
    const ohlc = candles.map((candle) => ({
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }));
    const atr = this.indicators.calculateAtr(
      this.indicators.calculateTrueRangesFromCandles(ohlc),
      14,
    );
    if (
      ema20 === null ||
      previousEma20 === null ||
      rsi === null ||
      previousRsi === null ||
      atr === null
    ) {
      return no("NO_TRADE: insufficient 1H indicators.");
    }

    const previous = candles.at(-2)!;
    const recentPullback = candles.slice(-4, -1).some((candle, offset) => {
      const candleIndex = candles.length - 4 + offset;
      const ownEma = this.correctedAnalysis
        ? this.indicators.calculateEma(closes.slice(0, candleIndex + 1), 20)
        : ema20;
      return ownEma !== null && Number(candle.low) <= ownEma;
    });
    const adx = this.correctedAnalysis
      ? this.indicators.calculateAdxFromCandles(ohlc, 14)
      : 0;
    if (adx === null || !Number.isFinite(adx))
      return no("NO_TRADE: invalid ADX diagnostic.");
    const bullishConfirmation =
      Number(latest.close) > Number(latest.open) &&
      Number(latest.close) >
        Number(this.smallProfit ? previous.close : previous.high) &&
      Number(latest.close) > ema20;
    const volumeConfirmed =
      Number(latest.volume) >
      (this.smallProfit
        ? candles
            .slice(-4, -1)
            .reduce((sum, candle) => sum + Number(candle.volume), 0) / 3
        : Math.max(
            ...candles.slice(-4, -1).map((candle) => Number(candle.volume)),
          ));
    if (!recentPullback || !bullishConfirmation) {
      return no(
        "NO_TRADE: 1H pullback and bullish close confirmation are incomplete.",
      );
    }
    if (!(rsi >= 40 && rsi > previousRsi)) {
      return no("NO_TRADE: 1H RSI is not rising through the execution zone.");
    }
    if (!volumeConfirmed) {
      return no(
        "NO_TRADE: 1H confirmation volume is not above the prior three candles.",
      );
    }

    const entry = Number(latest.close);
    const localStop = Math.min(
      ...candles.slice(-3).map((candle) => Number(candle.low) - atr * 0.15),
      entry - atr * 0.75,
    );
    const levels = this.smallProfit
      ? {
          stopLoss: localStop,
          takeProfit: entry + Math.min(entry * 0.008, atr * 1.5),
        }
      : this.risk.calculateLevels("BUY", Number(latest.close), candles, atr, 2);
    if (levels.stopLoss === null || levels.takeProfit === null) {
      return no("NO_TRADE: no valid structural risk levels.");
    }
    if (this.smallProfit && (entry - levels.stopLoss) / entry > 0.006) {
      return no(
        "NO_TRADE: local structural stop exceeds the 0.6% risk ceiling.",
      );
    }
    if (this.setupStructure) {
      levels.stopLoss = Math.min(
        ...candles.slice(-4).map((candle) => Number(candle.low) - atr * 0.15),
        entry - atr * 1.5,
      );
      const setupRisk = entry - levels.stopLoss;
      if (
        levels.stopLoss <= 0 ||
        setupRisk > atr * 3 ||
        setupRisk / entry > 0.015
      ) {
        return no("NO_TRADE: setup structural risk exceeds ATR/price ceiling.");
      }
      levels.takeProfit =
        entry + Math.min(setupRisk * 2, atr * 4, entry * 0.015);
    } else if (this.profitExit) {
      levels.takeProfit = entry + Math.min(atr * 2, entry * 0.015);
    }
    const resistance = findNearestResistanceAbove(
      (this.setupStructure ? findUnbrokenSwingHighs : findConfirmedSwingHighs)(
        candles.slice(this.profitExit ? -201 : -60).map((candle) => ({
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        })),
      ),
      Number(latest.close),
    );
    const takeProfit =
      resistance === null
        ? levels.takeProfit
        : Math.min(levels.takeProfit, resistance - atr * 0.15);
    const risk = Number(latest.close) - levels.stopLoss;
    const minimumRewardRisk = this.profitExit
      ? 0.75
      : this.smallProfit
        ? 1
        : 1.25;
    const targetLimit =
      this.smallProfit || this.profitExit
        ? Math.min(levels.takeProfit, takeProfit)
        : resistance === null
          ? undefined
          : resistance - atr * 0.15;
    if (
      takeProfit <= Number(latest.close) ||
      (takeProfit - Number(latest.close)) / risk < minimumRewardRisk
    ) {
      return no("NO_TRADE: insufficient room to confirmed 1H resistance.");
    }
    const rate = (key: string) => {
      const value = Number(this.config.get(key, 0.0005));
      return Number.isFinite(value) && value >= 0 ? value : 0.0005;
    };
    if (
      !hasPositiveNetTarget(
        {
          ...no(""),
          action: "BUY",
          entryPrice: Number(latest.close),
          stopLoss: levels.stopLoss,
          takeProfit,
          minimumNetRewardRisk: this.profitExit ? 0.5 : undefined,
        },
        rate("BACKTESTING_FEE_RATE"),
        rate("BACKTESTING_SLIPPAGE_RATE"),
      )
    ) {
      return no(
        this.profitExit
          ? "NO_TRADE: target has insufficient net reward after fees and slippage (minimum 0.5R)."
          : "NO_TRADE: target cannot cover configured fees and slippage.",
      );
    }
    return {
      action: "BUY",
      confidence: this.correctedAnalysis ? 0 : 70,
      confidenceBasis: this.correctedAnalysis ? "NOT_ESTIMATED" : undefined,
      entryPrice: Number(latest.close),
      stopLoss: levels.stopLoss,
      takeProfit,
      isStrongSetup: true,
      takeProfitLimit: targetLimit,
      preserveTakeProfit: this.profitExit || undefined,
      profitProtection: this.profitExit || undefined,
      minimumNetRewardRisk: this.profitExit ? 0.5 : undefined,
      maximumStopDistanceFraction: this.setupStructure
        ? 0.015
        : this.smallProfit
          ? 0.006
          : undefined,
      minimumRewardRisk,
      trend: "BULLISH",
      rsi,
      adx,
      rsiStatus: this.indicators.classifyRsi(rsi),
      marketCondition: "BULLISH_CONTINUATION",
      candleTime: latest.time,
      reason: this.setupStructure
        ? "RESEARCH: causal pullback with setup structural stop, risk-based capped target and unbroken resistance."
        : this.profitExit
          ? "RESEARCH: original 4H/1H entry with a nearby ATR/resistance target and profit protection after a closed candle."
          : this.smallProfit
            ? "RESEARCH: 4H trend / 1H pullback with a small volatility-based target and bounded structural risk."
            : "RESEARCH: 4H bullish trend with 1H pullback, momentum, volume, and structural room.",
    };
  }
}
