import { Injectable } from "@nestjs/common";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { RiskManagerService } from "../risk/risk-manager.service";
import { TradingSignal } from "../signals/signal.types";
import { TradingStrategy } from "../signals/trading-strategy.port";

/** Forward-observation rule only. It is deliberately not an approved strategy. */
@Injectable()
export class ExploratoryHourlyBreakoutStrategy implements TradingStrategy {
  readonly version = "exploratory-hourly-trend-pullback-v1";
  readonly minimumHistory = 201;
  readonly supportedTimeframes = [Timeframe.ONE_HOUR] as const;
  readonly evaluationScope = "PORTFOLIO" as const;
  readonly requiresHigherTimeframeConfirmation = false;
  readonly minimumTradesPerSegment = 0;
  readonly minimumContributingSymbols = 0;
  readonly maxHoldingCandles = 24;
  constructor(
    private readonly indicators: IndicatorsService,
    private readonly risk: RiskManagerService,
  ) {}
  getTrend(candles: MarketCandle[]): TradingSignal["trend"] | null {
    const closes = candles.map((c) => Number(c.close));
    const sma = this.indicators.calculateSma(closes, 200);
    return sma === null ? null : closes.at(-1)! > sma ? "BULLISH" : "BEARISH";
  }
  evaluateCandles(
    candles: MarketCandle[],
    _a?: number,
    _b?: number,
    _c?: TradingSignal["trend"],
    symbol?: string,
  ): TradingSignal {
    const latest = candles.at(-1);
    const no = (reason: string): TradingSignal => ({
      action: "NO_TRADE",
      confidence: 0,
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
      !latest ||
      candles.length < 201 ||
      (symbol !== "BTCUSDT" && symbol !== "ETHUSDT")
    )
      return no("NO_TRADE: exploratory universe/history requirement not met.");
    const closes = candles.map((c) => Number(c.close));
    const sma = this.indicators.calculateSma(closes, 200);
    const ema20 = this.indicators.calculateEma(closes, 20);
    const rsi = this.indicators.calculateRsiFromPrices(closes, 14) ?? 50;
    const previousLow = Number(candles.at(-2)!.low);
    const atr = this.indicators.calculateAtr(
      this.indicators.calculateTrueRangesFromCandles(
        candles.map((c) => ({
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        })),
      ),
      14,
    );
    if (
      sma === null ||
      atr === null ||
      closes.at(-1)! <= sma ||
      ema20 === null ||
      previousLow > ema20 ||
      closes.at(-1)! <= ema20 ||
      rsi < 45 || rsi > 65
    )
      return no("NO_TRADE: hourly trend pullback conditions are incomplete.");
    const levels = this.risk.calculateLevels(
      "BUY",
      closes.at(-1)!,
      candles,
      atr,
      2,
    );
    if (levels.stopLoss === null || levels.takeProfit === null)
      return no("NO_TRADE: no valid risk levels.");
    return {
      action: "BUY",
      confidence: 65,
      entryPrice: closes.at(-1)!,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      isStrongSetup: true,
      trend: "BULLISH",
      rsi,
      adx: 0,
      rsiStatus: this.indicators.classifyRsi(rsi),
      marketCondition: "BULLISH_CONTINUATION",
      candleTime: latest.time,
      reason: "EXPERIMENTAL: hourly SMA-200 trend, EMA-20 pullback, and RSI confirmation.",
    };
  }
}
