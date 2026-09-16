import { TradingSignal } from "./signal.types";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { Inject, Injectable } from "@nestjs/common";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import type { MarketDataPort } from "./market-data.port";
import { MarketCandle } from "../market-data/entities/market-candle.entity";

const STRONG_SETUP_THRESHOLD = 75;
@Injectable()
export class SignalsService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataPort,
    private readonly indicatorsService: IndicatorsService,
  ) {}

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
      reason:
        action === "BUY"
          ? `Bullish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
          : action === "SELL"
            ? `Bearish trend confirmed by higher timeframe. RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`
            : `No valid trading setup. Trend: ${trend}, Higher timeframe trend: ${higherTimeframeTrend ?? "N/A"}, RSI: ${rsi}, ADX: ${adx}, Market condition: ${marketCondition}.`,
    };
  }

  async generateSignal(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<TradingSignal | null> {
    const trend = await this.marketDataService.getTrend(
      symbol,
      timeframe,
      period,
    );
    const higherTimeframeTrend = await this.getHigherTimeframeTrend(
      symbol,
      timeframe,
      period,
    );
    const priceVsSma = await this.marketDataService.compareLatestPriceToSma(
      symbol,
      timeframe,
      period,
    );

    const priceVsEma = await this.marketDataService.compareLatestPriceToEma(
      symbol,
      timeframe,
      period,
    );

    const rsi = await this.marketDataService.getLatestRsi(symbol, timeframe);

    const rsiStatus = await this.marketDataService.getRsiStatus(
      symbol,
      timeframe,
      period,
    );

    const marketCondition = await this.marketDataService.getMarketCondition(
      symbol,
      timeframe,
      period,
    );
    const entryPrice = await this.marketDataService.getLatestPrice(
      symbol,
      timeframe,
    );
    const atr = await this.marketDataService.getLatestAtr(
      symbol,
      timeframe,
      period,
    );
    const adx = await this.marketDataService.getLatestAdx(
      symbol,
      timeframe,
      period,
    );
    if (
      trend === null ||
      priceVsSma === null ||
      priceVsEma === null ||
      rsi === null ||
      rsiStatus === null ||
      marketCondition === null ||
      entryPrice === null ||
      atr === null ||
      adx === null
    ) {
      return null;
    }

    return this.createSignal(
      trend,
      entryPrice,
      atr,
      priceVsSma,
      priceVsEma,
      rsi,
      adx,
      rsiStatus,
      marketCondition,
      higherTimeframeTrend,
    );
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

  async getHigherTimeframeTrend(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null> {
    const higherTimeframe =
      timeframe === Timeframe.FIFTEEN_MINUTES
        ? Timeframe.ONE_HOUR
        : timeframe === Timeframe.ONE_HOUR
          ? Timeframe.FOUR_HOURS
          : timeframe === Timeframe.FOUR_HOURS
            ? Timeframe.ONE_DAY
            : null;

    if (higherTimeframe === null) {
      return null;
    }

    return this.marketDataService.getTrend(symbol, higherTimeframe, period);
  }
  async generateSignalFromCandles(
    symbol: string,
    timeframe: Timeframe,
    candles: MarketCandle[],
  ): Promise<TradingSignal | null> {
    const indicators = this.indicatorsService.calculateIndicatorsFromCandles(
      candles,
      14,
    );

    if (indicators === null) {
      return null;
    }

    const entryPrice = Number(candles[candles.length - 1].close);

    const higherTimeframeTrend = await this.getHigherTimeframeTrend(
      symbol,
      timeframe,
      14,
    );

    const {
      trend,
      priceVsSma,
      priceVsEma,
      rsi,
      rsiStatus,
      marketCondition,
      atr,
      adx,
    } = indicators;

    return this.createSignal(
      trend,
      entryPrice,
      atr,
      priceVsSma,
      priceVsEma,
      rsi,
      adx,
      rsiStatus,
      marketCondition,
      higherTimeframeTrend,
    );
  }
}
