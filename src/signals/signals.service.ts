import { Injectable } from "@nestjs/common";
import { TradingSignal } from "./signal.types";
import { MarketDataService } from "../market-data/market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";

const STRONG_SETUP_THRESHOLD = 75;
@Injectable()
export class SignalsService {
  constructor(
    private readonly marketDataService: MarketDataService,

    private readonly indicatorsService: IndicatorsService,
  ) {}

  determineAction(
    marketCondition: TradingSignal["marketCondition"],
    isStrongSetup: boolean,
  ): TradingSignal["action"] {
    if (!isStrongSetup) {
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
    rsiStatus: TradingSignal["rsiStatus"],
    marketCondition: TradingSignal["marketCondition"],
  ): TradingSignal {
    const trendScore = this.indicatorsService.calculateTrendScore(trend);
    const averageAlignmentScore =
      this.indicatorsService.calculateAverageAlignmentScore(
        priceVsSma,
        priceVsEma,
      );
    const rsiScore = this.indicatorsService.calculateRsiScore(rsiStatus);
    const confidence = this.calculateConfidence(
      trendScore,
      averageAlignmentScore,
      rsiScore,
    );
    const isStrongSetup = confidence >= STRONG_SETUP_THRESHOLD;
    const action = this.determineAction(marketCondition, isStrongSetup);
const stopLoss = this.calculateStopLoss(
  action === "BUY" ? "BUY" : "SELL",
  entryPrice,
  atr,
);
    return {
      action,
      confidence,
      entryPrice,
      stopLoss,
      isStrongSetup,
      trend,
      rsi,
      rsiStatus,
      marketCondition,
      reason: `Trend is ${trend} and RSI status is ${rsiStatus}.`,
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
const entryPrice =
  await this.marketDataService.getLatestPrice(
    symbol,
    timeframe,
  );
  const atr = await this.marketDataService.getLatestAtr(
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
      marketCondition === null||
      entryPrice === null ||
      atr === null
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
      rsiStatus,
      marketCondition,
    ); 
  }

  calculateConfidence(
    trendScore: number,
    averageAlignmentScore: number,
    rsiScore: number,
  ): number {
    return trendScore + averageAlignmentScore + rsiScore;
  }

  calculateStopLoss(
  action: 'BUY' | 'SELL',
  entryPrice: number,
  atr: number,
): number {
  const stopDistance = 1.5 * atr;

  if (action === 'BUY') {
    return entryPrice - stopDistance;
  }

  return entryPrice + stopDistance;
}

}
