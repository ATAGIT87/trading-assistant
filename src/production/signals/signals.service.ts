import { Injectable } from "@nestjs/common";
import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  EMA_RSI_STRATEGY_VERSION,
  MarketAnalysis,
} from "../trading/ccxt/analyze-market";
import { MarketAnalysisService } from "../trading/ccxt/market-analysis.service";
import { EmaRsiSpotStrategy } from "../trading/ema-rsi-spot.strategy";
import { StrategyRegistryService } from "./strategy-registry.service";
import { TradingSignal } from "./signal.types";

@Injectable()
export class SignalsService {
  constructor(
    private readonly registry: StrategyRegistryService,
    private readonly marketAnalysis: MarketAnalysisService,
    private readonly strategy: EmaRsiSpotStrategy,
  ) {}

  isUnifiedStrategyActive(): boolean {
    return this.registry.getActiveVersion() === EMA_RSI_STRATEGY_VERSION;
  }

  getMarketAnalysis(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketAnalysis> {
    if (!this.isUnifiedStrategyActive())
      return Promise.resolve({
        symbol,
        timeframe,
        shouldBuy: false,
        reason: "NO_ACTIVE_STRATEGY",
      });
    return this.marketAnalysis.analyze(symbol, timeframe);
  }

  signalFromMarketAnalysis(result: MarketAnalysis): TradingSignal {
    return this.strategy.signalFromAnalysis(result);
  }

  async getLiveSignal(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<TradingSignal> {
    return this.signalFromMarketAnalysis(
      await this.getMarketAnalysis(symbol, timeframe),
    );
  }
}
