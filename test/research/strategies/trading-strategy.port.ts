import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { TradingSignal } from "../../../src/production/signals/signal.types";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";

export type StrategyTrend = TradingSignal["trend"];
export type StrategyEvaluationScope = "SYMBOL" | "PORTFOLIO";

/** A deterministic strategy that can be evaluated both live and in a backtest. */
export interface TradingStrategy {
  readonly version: string;
  readonly minimumHistory: number;
  /** Minimum completed candles required by a higher-timeframe trend input. */
  readonly minimumHigherTimeframeHistory?: number;
  readonly supportedTimeframes: readonly Timeframe[];
  readonly evaluationScope: StrategyEvaluationScope;
  /** True only when the entry rule explicitly consumes a completed higher-timeframe trend. */
  readonly requiresHigherTimeframeConfirmation: boolean;
  /** Fixed before evaluation; applies to each validation/test/holdout segment. */
  readonly minimumTradesPerSegment: number;
  readonly minimumContributingSymbols: number;
  /** Close at the completed-candle close after this many candles if SL/TP was not hit. */
  readonly maxHoldingCandles: number;
  readonly profitProtection?: boolean;

  getTrend(candles: MarketCandle[]): StrategyTrend | null;

  evaluateCandles(
    candles: MarketCandle[],
    startIndex?: number,
    endIndex?: number,
    higherTimeframeTrend?: StrategyTrend,
    symbol?: string,
  ): TradingSignal;
}
