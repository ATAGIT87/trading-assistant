import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  getHigherTimeframe,
  timeframeDurationMs,
} from "../assets/timeframe.utils";
import { MarketDataService } from "../market-data/market-data.service";
import {
  STRATEGY_VERSION,
  StrategyV2Service,
} from "../signals/strategy-v2.service";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { BacktestTrade } from "./interfaces/backtest-trade.interface";
import { findTradeOutcome } from "./helpers/backtest-outcome.helper";
import { calculateBacktestStatistics } from "./helpers/backtest-statistics.helper";
import { calculateBacktestSummary } from "./helpers/backtest-summary.helper";
import { analyzeSellTrades } from "./helpers/sell-analysis.helper";
import { BacktestRun } from "./entities/backtest-run.entity";

@Injectable()
export class BacktestingService {
  private readonly feeRate: number;
  private readonly slippageRate: number;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly strategyV2Service: StrategyV2Service,
    private readonly configService: ConfigService,
    @InjectRepository(BacktestRun)
    private readonly backtestRunRepository: Repository<BacktestRun>,
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
  ): Promise<BacktestResult> {
    const candles =
      await this.marketDataService.getHistoricalCandles(
        symbol,
        timeframe,
      );
    const higherTimeframe = getHigherTimeframe(timeframe);
    const higherTimeframeCandles =
      higherTimeframe === null
        ? []
        : await this.marketDataService.getHistoricalCandles(
            symbol,
            higherTimeframe,
          );

    if (candles.length < 50) {
      return this.saveRun(symbol, timeframe, {
        strategyVersion: STRATEGY_VERSION,
        higherTimeframeConfirmation: higherTimeframe !== null,
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
      });
    }

    const splitIndex =
      Math.floor(candles.length * 0.7);

    const trades: BacktestTrade[] = [];
    const trainingTrades: BacktestTrade[] = [];
    const testTrades: BacktestTrade[] = [];

    let grossTotalR = 0;
    let totalFeeR = 0;
    let totalSlippageR = 0;

    const processSegment = async (
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

        const higherTimeframeTrend =
          higherTimeframe === null
            ? undefined
            : this.strategyV2Service.getTrend(
                higherTimeframeCandles.filter(
                  (candle) =>
                    candle.time.getTime() +
                      timeframeDurationMs[higherTimeframe] <=
                    candles[i].time.getTime(),
                ),
              );

        if (higherTimeframe !== null && higherTimeframeTrend === null) {
          i++;
          continue;
        }

        const signal =
          this.strategyV2Service.evaluateCandles(
            historicalCandles,
            0,
            historicalCandles.length,
            higherTimeframeTrend ?? undefined,
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

    await processSegment(
      0,
      splitIndex,
      trainingTrades,
    );

    await processSegment(
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

    return this.saveRun(symbol, timeframe, {
      strategyVersion: STRATEGY_VERSION,
      higherTimeframeConfirmation: higherTimeframe !== null,
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
    });
  }

  async findRuns(symbol: string, timeframe: Timeframe): Promise<BacktestRun[]> {
    return this.backtestRunRepository.find({
      where: { symbol, timeframe },
      order: { createdAt: "DESC" },
      take: 20,
    });
  }

  async getReadiness(symbol: string, timeframe: Timeframe) {
    const latestRun = await this.backtestRunRepository.findOne({
      where: { symbol, timeframe, strategyVersion: STRATEGY_VERSION },
      order: { createdAt: "DESC" },
    });

    if (!latestRun) {
      return {
        isReady: false,
        reason: "No backtest exists for the active strategy version.",
      };
    }

    const test = latestRun.result.test;
    const isReady =
      test.totalTrades >= 20 && test.totalR > 0 && test.expectancyR > 0;

    return {
      isReady,
      reason: isReady
        ? "Out-of-sample backtest criteria passed."
        : `Out-of-sample criteria failed: trades=${test.totalTrades}, totalR=${test.totalR.toFixed(2)}, expectancyR=${test.expectancyR.toFixed(2)}.`,
      runId: latestRun.id,
      test,
    };
  }

  async compareLatestRuns(
    symbol: string,
    timeframe: Timeframe,
    baselineVersion: string,
    candidateVersion: string,
  ) {
    const [baseline, candidate] = await Promise.all([
      this.backtestRunRepository.findOne({
        where: { symbol, timeframe, strategyVersion: baselineVersion },
        order: { createdAt: "DESC" },
      }),
      this.backtestRunRepository.findOne({
        where: { symbol, timeframe, strategyVersion: candidateVersion },
        order: { createdAt: "DESC" },
      }),
    ]);

    if (!baseline || !candidate) {
      return null;
    }

    return {
      baseline,
      candidate,
      delta: {
        totalR: candidate.result.totalR - baseline.result.totalR,
        expectancyR:
          candidate.result.expectancyR - baseline.result.expectancyR,
        winRate: candidate.result.winRate - baseline.result.winRate,
        testTotalR:
          candidate.result.test.totalR - baseline.result.test.totalR,
        testExpectancyR:
          candidate.result.test.expectancyR - baseline.result.test.expectancyR,
      },
    };
  }

  private async saveRun(
    symbol: string,
    timeframe: Timeframe,
    result: BacktestResult,
  ): Promise<BacktestResult> {
    await this.backtestRunRepository.save(
      this.backtestRunRepository.create({
        symbol,
        timeframe,
        strategyVersion: result.strategyVersion,
        result,
      }),
    );

    return result;
  }
}
