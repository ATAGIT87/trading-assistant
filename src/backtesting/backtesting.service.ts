import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketDataService } from "../market-data/market-data.service";
import { StrategyV2Service } from "../signals/strategy-v2.service";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { BacktestTrade } from "./interfaces/backtest-trade.interface";
import { findTradeOutcome } from "./helpers/backtest-outcome.helper";
import { calculateBacktestStatistics } from "./helpers/backtest-statistics.helper";
import { calculateBacktestSummary } from "./helpers/backtest-summary.helper";
import { analyzeSellTrades } from "./helpers/sell-analysis.helper";

@Injectable()
export class BacktestingService {
  private readonly feeRate: number;
  private readonly slippageRate: number;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly strategyV2Service: StrategyV2Service,
    private readonly configService: ConfigService,
  ) {
    this.feeRate = this.getNumericConfigValue(
      "BACKTESTING_FEE_RATE",
      0.0005,
    );

    this.slippageRate = this.getNumericConfigValue(
      "BACKTESTING_SLIPPAGE_RATE",
      0.0005,
    );
  }

  private getNumericConfigValue(
    key: string,
    fallback: number,
  ): number {
    const value = Number(
      this.configService.get<number | string>(
        key,
        fallback,
      ),
    );

    if (!Number.isFinite(value) || value < 0) {
      return fallback;
    }

    return value;
  }

  async run(
    symbol: string,
    timeframe: Timeframe,
    _useHigherTimeframeConfirmation = false,
    _excludeHighAdxSell = false,
  ): Promise<BacktestResult> {
    const candles =
      await this.marketDataService.getHistoricalCandles(
        symbol,
        timeframe,
      );

    if (candles.length < 50) {
      return {
        ...calculateBacktestStatistics([]),
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalR: 0,
        expectancyR: 0,
        grossTotalR: 0,
        totalFeeR: 0,
        totalSlippageR: 0,
        totalCostR: 0,
        training: calculateBacktestSummary([]),
        test: calculateBacktestSummary([]),
        trades: [],
      };
    }

    const splitIndex =
      Math.floor(candles.length * 0.7);

    const trades: BacktestTrade[] = [];
    const trainingTrades: BacktestTrade[] = [];
    const testTrades: BacktestTrade[] = [];

    let grossTotalR = 0;
    let totalFeeR = 0;
    let totalSlippageR = 0;

    const processSegment = (
      startIndex: number,
      endIndex: number,
      targetTrades: BacktestTrade[],
    ) => {
      let i = Math.max(
        startIndex,
        49,
      );

      while (i < endIndex) {
        const historicalCandles =
          candles.slice(0, i + 1);

        const signal =
          this.strategyV2Service.evaluateCandles(
            historicalCandles,
            0,
            historicalCandles.length,
          );

        if (
          signal.action !== "BUY" &&
          signal.action !== "SELL"
        ) {
          i++;
          continue;
        }

        if (
          signal.stopLoss === null ||
          signal.takeProfit === null
        ) {
          i++;
          continue;
        }

        const futureCandles =
          candles.slice(i + 1, endIndex);

        if (futureCandles.length === 0) {
          break;
        }

        const outcome =
          findTradeOutcome(
            signal,
            futureCandles,
          );

        const result =
          outcome.result === true
            ? "WIN"
            : outcome.result === false
              ? "LOSS"
              : "OPEN";

        const riskAmount =
          Math.abs(
            signal.entryPrice -
              signal.stopLoss,
          );

        const grossR =
          outcome.result === true
            ? 2
            : outcome.result === false
              ? -1
              : null;

        let feeR = 0;
        let slippageR = 0;
        let netR: number | null = grossR;

        if (
          grossR !== null &&
          riskAmount > 0
        ) {
          const entryPrice =
            signal.entryPrice;

          const exitPrice =
            outcome.exitPrice ??
            entryPrice;

          const entryFee =
            entryPrice *
            this.feeRate;

          const exitFee =
            exitPrice *
            this.feeRate;

          feeR =
            (entryFee + exitFee) /
            riskAmount;

          const entrySlippage =
            entryPrice *
            this.slippageRate;

          const exitSlippage =
            exitPrice *
            this.slippageRate;

          slippageR =
            (entrySlippage +
              exitSlippage) /
            riskAmount;

          netR =
            grossR -
            feeR -
            slippageR;
        }

        const backtestTrade: BacktestTrade = {
          time: candles[i].time,

          action: signal.action,

          confidence:
            signal.confidence,

          entryPrice:
            signal.entryPrice,

          exitPrice:
            outcome.exitPrice,

          stopLoss:
            signal.stopLoss,

          takeProfit:
            signal.takeProfit,

          trend:
            signal.trend,

          rsi:
            signal.rsi,

          adx:
            signal.adx,

          marketCondition:
            signal.marketCondition,

          result,

          exitTime:
            outcome.exitIndex === null
              ? null
              : (
                  futureCandles[
                    outcome.exitIndex
                  ]?.time ?? null
                ),

          riskAmount,

          resultR: netR,

          maeR:
            outcome.maeR,

          mfeR:
            outcome.mfeR,

          durationCandles:
            outcome.durationCandles,
        };

        trades.push(
          backtestTrade,
        );

        targetTrades.push(
          backtestTrade,
        );

        if (grossR !== null) {
          grossTotalR += grossR;
        }

        totalFeeR += feeR;
        totalSlippageR +=
          slippageR;

        if (
          outcome.exitIndex === null
        ) {
          break;
        }

        i =
          i +
          outcome.exitIndex +
          2;
      }
    };

    processSegment(
      0,
      splitIndex,
      trainingTrades,
    );

    processSegment(
      splitIndex,
      candles.length,
      testTrades,
    );

    const winningTrades =
      trades.filter(
        (trade) =>
          trade.resultR !== null &&
          trade.resultR > 0,
      ).length;

    const losingTrades =
      trades.filter(
        (trade) =>
          trade.resultR !== null &&
          trade.resultR < 0,
      ).length;

    const completedTrades =
      winningTrades +
      losingTrades;

    const totalR =
      trades.reduce(
        (sum, trade) =>
          sum +
          (trade.resultR ?? 0),
        0,
      );

    const expectancyR =
      completedTrades === 0
        ? 0
        : totalR /
          completedTrades;

    const statistics =
      calculateBacktestStatistics(
        trades,
      );

    const training =
      calculateBacktestSummary(
        trainingTrades,
      );

    const test =
      calculateBacktestSummary(
        testTrades,
      );

    const sellAnalysis =
      analyzeSellTrades(
        trades,
      );

    console.log(
      "\n========== SELL ANALYSIS ==========",
    );
    console.table(
      sellAnalysis,
    );
    console.log(
      "===================================\n",
    );

    console.log(
      "\n========== V2 BACKTEST ==========",
    );

    console.log({
      totalTrades:
        trades.length,
      winningTrades,
      losingTrades,
      winRate:
        completedTrades === 0
          ? 0
          : (
              winningTrades /
              completedTrades
            ) * 100,
      totalR,
      expectancyR,
    });

    console.log(
      "=================================\n",
    );

    return {
      ...statistics,

      totalTrades:
        trades.length,

      winningTrades,

      losingTrades,

      winRate:
        completedTrades === 0
          ? 0
          : (
              winningTrades /
              completedTrades
            ) * 100,

      totalR,

      expectancyR,

      grossTotalR,

      totalFeeR,

      totalSlippageR,

      totalCostR:
        totalFeeR +
        totalSlippageR,

      training,

      test,

      trades,
    };
  }
}