import { Inject, Injectable } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  getHigherTimeframe,
  timeframeDurationMs,
} from "../assets/timeframe.utils";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import type { MarketDataPort } from "./market-data.port";
import { StrategyV2Service } from "./strategy-v2.service";
import { TradingSignal } from "./signal.types";

@Injectable()
export class SignalsService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataPort,
    private readonly strategyV2Service: StrategyV2Service,
  ) {}

  async generateSignalV2(
    symbol: string,
    timeframe: Timeframe,
    _period: number,
    higherTimeframeTrend?: TradingSignal["trend"],
  ): Promise<TradingSignal | null> {
    const candles =
      await this.marketDataService.getHistoricalCandles(
        symbol,
        timeframe,
      );

    if (candles.length === 0) {
      return null;
    }

    return this.strategyV2Service.evaluateCandles(
      candles,
      0,
      candles.length,
      higherTimeframeTrend,
    );
  }

  async getLiveV2Signal(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<TradingSignal> {
    const candles =
      await this.marketDataService.getHistoricalCandles(
        symbol,
        timeframe,
      );

    const completedCandles =
      this.getCompletedCandles(
        candles,
        timeframe,
      );

    if (completedCandles.length === 0) {
      return {
        action: "NO_TRADE" as const,
        confidence: 0,
        entryPrice: 0,
        stopLoss: null,
        takeProfit: null,
        isStrongSetup: false,
        trend: "NEUTRAL",
        rsi: 50,
        adx: 0,
        rsiStatus: "NEUTRAL",
        marketCondition: "NEUTRAL",
        candleTime: new Date(),
        reason:
          "No completed candles are available at request time.",
      };
    }

    const signal =
      this.strategyV2Service.evaluateCandles(
        completedCandles,
        0,
        completedCandles.length,
        await this.getHigherTimeframeTrend(symbol, timeframe),
      );

    return signal;
  }

  private getCompletedCandles(
    candles: MarketCandle[],
    timeframe: Timeframe,
    now = new Date(),
  ): MarketCandle[] {
    return candles.filter(
      (candle) =>
        candle.time.getTime() +
          timeframeDurationMs[timeframe] <=
        now.getTime(),
    );
  }

  private async getHigherTimeframeTrend(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<TradingSignal["trend"] | undefined> {
    const higherTimeframe = getHigherTimeframe(timeframe);

    if (higherTimeframe === null) {
      return undefined;
    }

    const higherTimeframeCandles = this.getCompletedCandles(
      await this.marketDataService.getHistoricalCandles(symbol, higherTimeframe),
      higherTimeframe,
    );

    return this.strategyV2Service.getTrend(higherTimeframeCandles) ?? "NEUTRAL";
  }
}
