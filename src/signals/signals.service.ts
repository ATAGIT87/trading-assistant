import { Inject, Injectable } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
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
  ) {
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
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        signalTime: new Date(),
        entry: null,
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
        reason:
          "No completed candles are available at request time.",
        strategyVersion: "V2",
      };
    }

    const signal =
      this.strategyV2Service.evaluateCandles(
        completedCandles,
        0,
        completedCandles.length,
      );

    const isTradeSignal =
      signal.action === "BUY" ||
      signal.action === "SELL";

    return {
      symbol,
      timeframe,
      action: signal.action,
      signalTime: signal.candleTime,
      entry: isTradeSignal
        ? signal.entryPrice
        : null,
      stopLoss: isTradeSignal
        ? signal.stopLoss
        : null,
      takeProfit: isTradeSignal
        ? signal.takeProfit
        : null,
      riskReward: isTradeSignal
        ? this.calculateRiskReward(
            signal.entryPrice,
            signal.stopLoss,
            signal.takeProfit,
          )
        : null,
      reason: signal.reason,
      strategyVersion: "V2",
    };
  }

  async getSignalByCandleTime(
    symbol: string,
    timeframe: Timeframe,
    candleTime: Date,
  ) {
    return null;
  }

  private getCompletedCandles(
    candles: MarketCandle[],
    timeframe: Timeframe,
    now = new Date(),
  ): MarketCandle[] {
    const durationMs =
      timeframe === Timeframe.FIFTEEN_MINUTES
        ? 15 * 60 * 1000
        : timeframe === Timeframe.ONE_HOUR
          ? 60 * 60 * 1000
          : timeframe === Timeframe.FOUR_HOURS
            ? 4 * 60 * 60 * 1000
            : timeframe === Timeframe.ONE_DAY
              ? 24 * 60 * 60 * 1000
              : 0;

    return candles.filter(
      (candle) =>
        candle.time.getTime() +
          durationMs <
        now.getTime(),
    );
  }

  private calculateRiskReward(
    entryPrice: number,
    stopLoss: number | null,
    takeProfit: number | null,
  ): number | null {
    if (
      stopLoss === null ||
      takeProfit === null
    ) {
      return null;
    }

    const risk =
      Math.abs(
        entryPrice - stopLoss,
      );

    if (risk <= 0) {
      return null;
    }

    return (
      Math.abs(
        takeProfit - entryPrice,
      ) / risk
    );
  }
}