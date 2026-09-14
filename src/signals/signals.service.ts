import { Injectable } from "@nestjs/common";
import { TradingSignal } from "./signal.types";
import { MarketDataService } from "../market-data/market-data.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";

@Injectable()
export class SignalsService {
  constructor(
    private readonly marketDataService: MarketDataService,

    private readonly indicatorsService: IndicatorsService,
  ) {}

  determineAction(
    marketCondition: TradingSignal["marketCondition"],
  ): TradingSignal["action"] {
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
    priceVsSma: "ABOVE" | "BELOW" | "EQUAL",
    priceVsEma: "ABOVE" | "BELOW" | "EQUAL",
    rsi: number,
    rsiStatus: TradingSignal["rsiStatus"],
    marketCondition: TradingSignal["marketCondition"],
  ): TradingSignal {
    const action = this.determineAction(marketCondition);
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

    return {
      action,
      confidence,
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

    if (
      trend === null ||
      priceVsSma === null ||
      priceVsEma === null ||
      rsi === null ||
      rsiStatus === null ||
      marketCondition === null
    ) {
      return null;
    }

    return this.createSignal(trend,priceVsSma,priceVsEma,rsi,rsiStatus,marketCondition,);
  }

  calculateConfidence(
    trendScore: number,
    averageAlignmentScore: number,
    rsiScore: number,
  ): number {
    return trendScore + averageAlignmentScore + rsiScore;
  }
}
