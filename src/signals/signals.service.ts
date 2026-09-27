import { Inject, Injectable } from "@nestjs/common";

import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  getHigherTimeframe,
  timeframeDurationMs,
} from "../assets/timeframe.utils";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import type { MarketDataPort } from "./market-data.port";
import { StrategyRegistryService } from "./strategy-registry.service";
import { TradingSignal } from "./signal.types";
import { enforceSpotEntryPolicy } from "../trading/spot-trading-policy";

@Injectable()
export class SignalsService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataPort,
    private readonly strategyRegistry: StrategyRegistryService,
  ) {}

  async generateSignalV2(
    symbol: string,
    timeframe: Timeframe,
    _period: number,
    higherTimeframeTrend?: TradingSignal["trend"],
  ): Promise<TradingSignal | null> {
    const strategy = this.strategyRegistry.getActive();
    if (!strategy) {
      return null;
    }
    if (!strategy.supportedTimeframes.includes(timeframe)) {
      return null;
    }

    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    if (candles.length === 0) {
      return null;
    }

    return enforceSpotEntryPolicy(
      strategy.evaluateCandles(
        candles,
        0,
        candles.length,
        higherTimeframeTrend,
        symbol,
      ),
    );
  }

  async getLiveV2Signal(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<TradingSignal> {
    const strategy = this.strategyRegistry.getActive();
    if (!strategy) {
      return this.noTradeSignal(
        "No strategy is active: the previous research candidate was rejected and Demo remains disabled.",
      );
    }
    if (!strategy.supportedTimeframes.includes(timeframe)) {
      return this.noTradeSignal(
        `Strategy ${strategy.version} is not defined for ${timeframe}.`,
      );
    }

    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    const completedCandles = this.getCompletedCandles(candles, timeframe);

    if (completedCandles.length === 0) {
      return this.noTradeSignal(
        "No completed candles are available at request time.",
      );
    }

    const higherTimeframeTrend = strategy.requiresHigherTimeframeConfirmation
      ? await this.getHigherTimeframeTrend(symbol, timeframe)
      : undefined;
    const signal = strategy.evaluateCandles(
      completedCandles,
      0,
      completedCandles.length,
      higherTimeframeTrend,
      symbol,
    );

    return enforceSpotEntryPolicy(signal);
  }

  private getCompletedCandles(
    candles: MarketCandle[],
    timeframe: Timeframe,
    now = new Date(),
  ): MarketCandle[] {
    return candles.filter(
      (candle) =>
        candle.time.getTime() + timeframeDurationMs[timeframe] <= now.getTime(),
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
      await this.marketDataService.getHistoricalCandles(
        symbol,
        higherTimeframe,
      ),
      higherTimeframe,
    );

    const strategy = this.strategyRegistry.getActive();
    return strategy?.getTrend(higherTimeframeCandles) ?? "NEUTRAL";
  }

  private noTradeSignal(reason: string): TradingSignal {
    return {
      action: "NO_TRADE",
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
      reason,
    };
  }
}
