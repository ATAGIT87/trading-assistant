import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  getHigherTimeframe,
  timeframeDurationMs,
} from "../assets/timeframe.utils";
import { MarketDataService } from "../market-data/market-data.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { supportedTradingSymbols } from "../market-data/trading-symbol";
import { StrategyRegistryService } from "../signals/strategy-registry.service";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { BacktestSummary } from "./interfaces/backtest-result.interface";
import { BacktestTrade } from "./interfaces/backtest-trade.interface";
import { findTradeOutcome } from "./helpers/backtest-outcome.helper";
import { executeSignalAtNextOpen } from "./helpers/backtest-execution.helper";
import { calculateBacktestStatistics } from "./helpers/backtest-statistics.helper";
import { calculateBacktestSummary } from "./helpers/backtest-summary.helper";
import { BacktestRun } from "./entities/backtest-run.entity";
import { isAllowedSpotEntry } from "../trading/spot-trading-policy";
import { aggregatePortfolioBacktests } from "./helpers/portfolio-backtest.helper";
import { applyPortfolioCapacity } from "./helpers/portfolio-capacity.helper";
import { PortfolioBacktestResult } from "./interfaces/portfolio-backtest-result.interface";
import { WalkForwardPortfolioResult } from "./interfaces/walk-forward-result.interface";
import { buildWalkForwardWindows } from "./helpers/walk-forward.helper";
import { buildBacktestPeriods } from "./helpers/backtest-periods.helper";
import {
  assessMarketDataQuality,
  getLatestContinuousCandleSegment,
} from "../market-data/market-data-quality";

@Injectable()
export class BacktestingService {
  private readonly feeRate: number;
  private readonly slippageRate: number;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly strategyRegistry: StrategyRegistryService,
    private readonly configService: ConfigService,
    @InjectRepository(BacktestRun)
    private readonly backtestRunRepository: Repository<BacktestRun>,
  ) {
    this.feeRate = this.getNumericConfigValue("BACKTESTING_FEE_RATE", 0.0005);

    this.slippageRate = this.getNumericConfigValue(
      "BACKTESTING_SLIPPAGE_RATE",
      0.0005,
    );
  }

  private getNumericConfigValue(key: string, fallback: number): number {
    const value = Number(
      this.configService.get<number | string>(key, fallback),
    );

    if (!Number.isFinite(value) || value < 0) {
      return fallback;
    }

    return value;
  }

  /**
   * TypeORM returns decimal columns as strings. Strategies read a candle many
   * times, so parse once at the research boundary instead of in every
   * indicator and outcome calculation. These detached copies are never saved.
   */
  private toNumericCandles(candles: MarketCandle[]): MarketCandle[] {
    return candles.map((candle) => ({
      ...candle,
      open: Number(candle.open) as unknown as string,
      high: Number(candle.high) as unknown as string,
      low: Number(candle.low) as unknown as string,
      close: Number(candle.close) as unknown as string,
      volume: Number(candle.volume) as unknown as string,
    }));
  }

  async run(
    symbol: string,
    timeframe: Timeframe,
    strategyVersion?: string,
    includeProtectedHoldout = false,
  ): Promise<BacktestResult> {
    const strategy = this.strategyRegistry.get(strategyVersion);
    if (!strategy.supportedTimeframes.includes(timeframe)) {
      throw new BadRequestException(
        `Strategy ${strategy.version} is not defined for ${timeframe}.`,
      );
    }
    const holdoutDays = Math.floor(
      this.getNumericConfigValue("BACKTEST_HOLDOUT_DAYS", 365),
    );
    const protectedHoldoutStart = new Date(
      Date.now() - holdoutDays * 24 * 60 * 60 * 1000,
    );
    const allCandles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );
    const scopedCandles = includeProtectedHoldout
      ? allCandles
      : allCandles.filter((candle) => candle.time < protectedHoldoutStart);
    const candles = this.toNumericCandles(
      getLatestContinuousCandleSegment(scopedCandles, timeframe),
    );
    const higherTimeframe = strategy.requiresHigherTimeframeConfirmation
      ? getHigherTimeframe(timeframe)
      : null;
    const allHigherTimeframeCandles =
      higherTimeframe === null
        ? []
        : await this.marketDataService.getHistoricalCandles(
            symbol,
            higherTimeframe,
          );
    const scopedHigherTimeframeCandles = includeProtectedHoldout
      ? allHigherTimeframeCandles
      : allHigherTimeframeCandles.filter(
          (candle) => candle.time < protectedHoldoutStart,
        );
    const higherTimeframeCandles =
      higherTimeframe === null
        ? []
        : this.toNumericCandles(
            getLatestContinuousCandleSegment(
              scopedHigherTimeframeCandles,
              higherTimeframe,
            ),
          );

    const primaryDataQuality = assessMarketDataQuality(
      symbol,
      timeframe,
      candles,
    );
    const higherTimeframeDataQuality =
      higherTimeframe === null
        ? null
        : assessMarketDataQuality(
            symbol,
            higherTimeframe,
            higherTimeframeCandles,
          );
    if (
      !primaryDataQuality.isUsableForResearch ||
      (higherTimeframeDataQuality !== null &&
        !higherTimeframeDataQuality.isUsableForResearch)
    ) {
      throw new BadRequestException(
        `Backtest blocked by market-data quality: primary=${primaryDataQuality.reason}` +
          (higherTimeframeDataQuality === null
            ? ""
            : ` higher=${higherTimeframeDataQuality.reason}`),
      );
    }

    const researchContext = {
      engineVersion: "spot-long-only-v2",
      codeRevision: this.configService.get<string>("APP_REVISION", "local"),
      feeRate: this.feeRate,
      slippageRate: this.slippageRate,
      protectedHoldoutStart: protectedHoldoutStart.toISOString(),
      primaryCandleRange: {
        firstCandleTime: primaryDataQuality.firstCandleTime,
        lastCompletedCandleTime: primaryDataQuality.lastCompletedCandleTime,
      },
    };

    const periods = buildBacktestPeriods(
      candles,
      protectedHoldoutStart,
      includeProtectedHoldout,
    );

    if (periods.selectionTestEndIndex < 50) {
      return this.saveRun(symbol, timeframe, {
        strategyVersion: strategy.version,
        researchContext,
        dataQuality: {
          primary: primaryDataQuality,
          higherTimeframe: higherTimeframeDataQuality,
        },
        higherTimeframeConfirmation: higherTimeframe !== null,
        includesProtectedHoldout: includeProtectedHoldout,
        protectedHoldoutDays: holdoutDays,
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
        validation: calculateBacktestSummary([]),
        test: calculateBacktestSummary([]),
        protectedHoldout: includeProtectedHoldout
          ? calculateBacktestSummary([])
          : null,
        trades: [],
      });
    }

    const trades: BacktestTrade[] = [];
    const trainingTrades: BacktestTrade[] = [];
    const validationTrades: BacktestTrade[] = [];
    const testTrades: BacktestTrade[] = [];
    const protectedHoldoutTrades: BacktestTrade[] = [];

    let grossTotalR = 0;
    let totalFeeR = 0;
    let totalSlippageR = 0;

    const processSegment = async (
      startIndex: number,
      endIndex: number,
      targetTrades: BacktestTrade[],
      segment: BacktestTrade["segment"],
    ) => {
      let i = Math.max(startIndex, strategy.minimumHistory - 1);
      let higherTimeframeEndIndex = 0;

      while (i < endIndex) {
        const historicalCandles = candles.slice(
          Math.max(0, i + 1 - strategy.minimumHistory),
          i + 1,
        );

        while (
          higherTimeframe !== null &&
          higherTimeframeEndIndex < higherTimeframeCandles.length &&
          higherTimeframeCandles[higherTimeframeEndIndex].time.getTime() +
            timeframeDurationMs[higherTimeframe] <=
            candles[i].time.getTime()
        ) {
          higherTimeframeEndIndex++;
        }

        const higherTimeframeTrend =
          higherTimeframe === null
            ? undefined
            : strategy.getTrend(
                higherTimeframeCandles.slice(
                  Math.max(
                    0,
                    higherTimeframeEndIndex - strategy.minimumHistory,
                  ),
                  higherTimeframeEndIndex,
                ),
              );

        if (higherTimeframe !== null && higherTimeframeTrend === null) {
          i++;
          continue;
        }

        const decisionSignal = strategy.evaluateCandles(
          historicalCandles,
          0,
          historicalCandles.length,
          higherTimeframeTrend ?? undefined,
          symbol,
        );

        if (!isAllowedSpotEntry(decisionSignal.action)) {
          i++;
          continue;
        }

        if (
          decisionSignal.stopLoss === null ||
          decisionSignal.takeProfit === null
        ) {
          i++;
          continue;
        }

        const futureCandles = candles.slice(i + 1, endIndex);

        if (futureCandles.length === 0) {
          break;
        }

        const signal = executeSignalAtNextOpen(
          decisionSignal,
          futureCandles[0],
        );

        if (signal === null) {
          i++;
          continue;
        }

        const outcome = findTradeOutcome(
          signal,
          futureCandles,
          strategy.maxHoldingCandles,
        );

        const result =
          outcome.result === true
            ? "WIN"
            : outcome.result === false
              ? "LOSS"
              : "OPEN";

        const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);

        const grossR = this.calculateGrossR(
          signal,
          outcome.exitPrice,
          outcome.exitReason,
        );

        let feeR = 0;
        let slippageR = 0;
        let netR: number | null = grossR;

        if (grossR !== null && riskAmount > 0) {
          const entryPrice = signal.entryPrice;

          const exitPrice = outcome.exitPrice ?? entryPrice;

          const entryFee = entryPrice * this.feeRate;

          const exitFee = exitPrice * this.feeRate;

          feeR = (entryFee + exitFee) / riskAmount;

          const entrySlippage = entryPrice * this.slippageRate;

          const exitSlippage = exitPrice * this.slippageRate;

          slippageR = (entrySlippage + exitSlippage) / riskAmount;

          netR = grossR - feeR - slippageR;
        }

        const backtestTrade: BacktestTrade = {
          symbol,
          segment,
          time: futureCandles[0].time,

          action: signal.action,

          confidence: signal.confidence,

          entryPrice: signal.entryPrice,

          exitPrice: outcome.exitPrice,

          stopLoss: signal.stopLoss,

          takeProfit: signal.takeProfit,

          trend: signal.trend,

          rsi: signal.rsi,

          adx: signal.adx,

          marketCondition: signal.marketCondition,

          result,

          exitReason: outcome.exitReason,

          exitTime:
            outcome.exitIndex === null
              ? null
              : (futureCandles[outcome.exitIndex]?.time ?? null),

          riskAmount,

          grossR,

          feeR,

          slippageR,

          resultR: netR,

          maeR: outcome.maeR,

          mfeR: outcome.mfeR,

          durationCandles: outcome.durationCandles,
        };

        trades.push(backtestTrade);

        targetTrades.push(backtestTrade);

        if (grossR !== null) {
          grossTotalR += grossR;
        }

        totalFeeR += feeR;
        totalSlippageR += slippageR;

        if (outcome.exitIndex === null) {
          break;
        }

        i = i + outcome.exitIndex + 2;
      }
    };

    await processSegment(
      0,
      periods.trainingEndIndex,
      trainingTrades,
      "training",
    );

    await processSegment(
      periods.trainingEndIndex,
      periods.validationEndIndex,
      validationTrades,
      "validation",
    );

    await processSegment(
      periods.validationEndIndex,
      periods.selectionTestEndIndex,
      testTrades,
      "test",
    );

    if (periods.protectedHoldoutStartIndex !== null) {
      await processSegment(
        periods.protectedHoldoutStartIndex,
        candles.length,
        protectedHoldoutTrades,
        "protectedHoldout",
      );
    }

    const winningTrades = trades.filter(
      (trade) => trade.resultR !== null && trade.resultR > 0,
    ).length;

    const losingTrades = trades.filter(
      (trade) => trade.resultR !== null && trade.resultR < 0,
    ).length;

    const completedTrades = winningTrades + losingTrades;

    const totalR = trades.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);

    const expectancyR = completedTrades === 0 ? 0 : totalR / completedTrades;

    const statistics = calculateBacktestStatistics(trades);

    const training = calculateBacktestSummary(trainingTrades);

    const test = calculateBacktestSummary(testTrades);

    const validation = calculateBacktestSummary(validationTrades);

    const protectedHoldout =
      periods.protectedHoldoutStartIndex === null
        ? null
        : calculateBacktestSummary(protectedHoldoutTrades);

    return this.saveRun(symbol, timeframe, {
      strategyVersion: strategy.version,
      researchContext,
      dataQuality: {
        primary: primaryDataQuality,
        higherTimeframe: higherTimeframeDataQuality,
      },
      higherTimeframeConfirmation: higherTimeframe !== null,
      includesProtectedHoldout: includeProtectedHoldout,
      protectedHoldoutDays: holdoutDays,
      ...statistics,

      totalTrades: trades.length,

      winningTrades,

      losingTrades,

      winRate:
        completedTrades === 0 ? 0 : (winningTrades / completedTrades) * 100,

      totalR,

      expectancyR,

      grossTotalR,

      totalFeeR,

      totalSlippageR,

      totalCostR: totalFeeR + totalSlippageR,

      training,

      validation,

      test,

      protectedHoldout,

      trades,
    });
  }

  async runPortfolio(
    timeframe: Timeframe,
    strategyVersion?: string,
  ): Promise<PortfolioBacktestResult> {
    const results: Array<{ symbol: string; result: BacktestResult }> = [];

    for (const symbol of supportedTradingSymbols) {
      results.push({
        symbol,
        result: await this.run(symbol, timeframe, strategyVersion, false),
      });
    }

    return aggregatePortfolioBacktests(
      timeframe,
      results,
      this.getMaxPortfolioPositions(),
    );
  }

  async runWalkForwardPortfolio(
    timeframe: Timeframe,
    strategyVersion?: string,
  ): Promise<WalkForwardPortfolioResult> {
    const strategy = this.strategyRegistry.get(strategyVersion);
    const symbolResults = await Promise.all(
      supportedTradingSymbols.map(async (symbol) => ({
        symbol,
        ...(await this.runWalkForwardSymbol(symbol, timeframe, strategy)),
      })),
    );
    const reference = symbolResults[0];

    return {
      strategyVersion: strategy.version,
      timeframe,
      includesProtectedHoldout: false,
      folds: (reference?.windows ?? []).map((window) => {
        const bySymbol = symbolResults.map(({ symbol, trades, candles }) => {
          const entry = Number(candles[window.startIndex + 1]?.open);
          const exit = Number(candles[window.endIndex - 1]?.close);
          const benchmarkBuyAndHoldReturnPct =
            entry > 0 && Number.isFinite(exit)
              ? ((exit - entry) / entry) * 100
              : 0;
          return {
            symbol,
            summary: calculateBacktestSummary(trades[window.index - 1] ?? []),
            benchmarkBuyAndHoldReturnPct,
          };
        });
        const acceptedTrades = applyPortfolioCapacity(
          symbolResults.flatMap(({ trades }) => trades[window.index - 1] ?? []),
          this.getMaxPortfolioPositions(),
        );
        const summary = calculateBacktestSummary(acceptedTrades);
        return {
          fold: window.index,
          startsAt: reference.candles[window.startIndex].time,
          endsAt: reference.candles[window.endIndex - 1].time,
          aggregate: {
            ...summary,
            benchmarkBuyAndHoldReturnPct:
              bySymbol.reduce(
                (sum, member) => sum + member.benchmarkBuyAndHoldReturnPct,
                0,
              ) / bySymbol.length,
          },
          bySymbol,
        };
      }),
    };
  }

  private async runWalkForwardSymbol(
    symbol: string,
    timeframe: Timeframe,
    strategy: ReturnType<StrategyRegistryService["get"]>,
  ) {
    const holdoutDays = Math.floor(
      this.getNumericConfigValue("BACKTEST_HOLDOUT_DAYS", 365),
    );
    const protectedHoldoutStart = new Date(
      Date.now() - holdoutDays * 24 * 60 * 60 * 1000,
    );
    const candles = (
      await this.marketDataService.getHistoricalCandles(symbol, timeframe)
    ).filter((candle) => candle.time < protectedHoldoutStart);
    const higherTimeframe = strategy.requiresHigherTimeframeConfirmation
      ? getHigherTimeframe(timeframe)
      : null;
    const higherCandles =
      higherTimeframe === null
        ? []
        : (
            await this.marketDataService.getHistoricalCandles(
              symbol,
              higherTimeframe,
            )
          ).filter((candle) => candle.time < protectedHoldoutStart);
    const windows = buildWalkForwardWindows(
      candles.length,
      strategy.minimumHistory,
    );

    return {
      candles,
      windows,
      trades: windows.map((window) =>
        this.simulateWalkForwardWindow(
          symbol,
          candles,
          higherCandles,
          timeframe,
          higherTimeframe,
          strategy,
          window.startIndex,
          window.endIndex,
        ),
      ),
    };
  }

  private simulateWalkForwardWindow(
    symbol: string,
    candles: MarketCandle[],
    higherCandles: MarketCandle[],
    timeframe: Timeframe,
    higherTimeframe: Timeframe | null,
    strategy: ReturnType<StrategyRegistryService["get"]>,
    startIndex: number,
    endIndex: number,
  ): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    let i = startIndex;
    let higherIndex = 0;
    while (
      higherTimeframe !== null &&
      higherIndex < higherCandles.length &&
      higherCandles[higherIndex].time.getTime() +
        timeframeDurationMs[higherTimeframe] <=
        candles[i].time.getTime()
    ) {
      higherIndex++;
    }

    while (i < endIndex) {
      const historical = candles.slice(
        Math.max(0, i + 1 - strategy.minimumHistory),
        i + 1,
      );
      while (
        higherTimeframe !== null &&
        higherIndex < higherCandles.length &&
        higherCandles[higherIndex].time.getTime() +
          timeframeDurationMs[higherTimeframe] <=
          candles[i].time.getTime()
      ) {
        higherIndex++;
      }
      const higherTrend =
        higherTimeframe === null
          ? undefined
          : strategy.getTrend(
              higherCandles.slice(
                Math.max(0, higherIndex - strategy.minimumHistory),
                higherIndex,
              ),
            );
      const decision = strategy.evaluateCandles(
        historical,
        0,
        historical.length,
        higherTrend ?? undefined,
        symbol,
      );
      if (
        !isAllowedSpotEntry(decision.action) ||
        decision.stopLoss === null ||
        decision.takeProfit === null
      ) {
        i++;
        continue;
      }
      const future = candles.slice(i + 1, endIndex);
      const signal =
        future.length === 0
          ? null
          : executeSignalAtNextOpen(decision, future[0]);
      if (signal === null) {
        i++;
        continue;
      }
      const outcome = findTradeOutcome(
        signal,
        future,
        strategy.maxHoldingCandles,
      );
      const result =
        outcome.result === true
          ? "WIN"
          : outcome.result === false
            ? "LOSS"
            : "OPEN";
      const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);
      const grossR = this.calculateGrossR(
        signal,
        outcome.exitPrice,
        outcome.exitReason,
      );
      const exitPrice = outcome.exitPrice ?? signal.entryPrice;
      const costR =
        grossR === null || riskAmount <= 0
          ? 0
          : ((signal.entryPrice + exitPrice) *
              (this.feeRate + this.slippageRate)) /
            riskAmount;
      trades.push({
        symbol,
        segment: "test",
        time: future[0].time,
        action: signal.action,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        exitPrice: outcome.exitPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        trend: signal.trend,
        rsi: signal.rsi,
        adx: signal.adx,
        marketCondition: signal.marketCondition,
        result,
        exitReason: outcome.exitReason,
        exitTime:
          outcome.exitIndex === null
            ? null
            : (future[outcome.exitIndex]?.time ?? null),
        riskAmount,
        grossR,
        feeR:
          grossR === null
            ? 0
            : ((signal.entryPrice + exitPrice) * this.feeRate) / riskAmount,
        slippageR:
          grossR === null
            ? 0
            : ((signal.entryPrice + exitPrice) * this.slippageRate) /
              riskAmount,
        resultR: grossR === null ? null : grossR - costR,
        maeR: outcome.maeR,
        mfeR: outcome.mfeR,
        durationCandles: outcome.durationCandles,
      });
      if (outcome.exitIndex === null) break;
      i += outcome.exitIndex + 2;
    }
    return trades;
  }

  private calculateGrossR(
    signal: {
      action: "BUY" | "SELL";
      entryPrice: number;
      stopLoss: number;
      takeProfit: number;
    },
    exitPrice: number | null,
    exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null,
  ): number | null {
    const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);
    if (riskAmount <= 0 || exitPrice === null || exitReason === null) {
      return null;
    }

    const priceMove =
      signal.action === "BUY"
        ? exitPrice - signal.entryPrice
        : signal.entryPrice - exitPrice;
    return priceMove / riskAmount;
  }

  async findRuns(symbol: string, timeframe: Timeframe): Promise<BacktestRun[]> {
    return this.backtestRunRepository.find({
      where: { symbol, timeframe },
      order: { createdAt: "DESC" },
      take: 20,
    });
  }

  async getReadiness(symbol: string, timeframe: Timeframe) {
    const activeStrategyVersion = this.strategyRegistry.getActiveVersion();
    if (!activeStrategyVersion) {
      return {
        isReady: false,
        strategyVersion: null,
        reason:
          "No strategy is active. Research must register and approve a new candidate before Demo can be enabled.",
      };
    }

    const activeStrategy = this.strategyRegistry.getActive();
    if (activeStrategy?.evaluationScope === "PORTFOLIO") {
      return this.getPortfolioReadiness(
        timeframe,
        activeStrategyVersion,
        activeStrategy.minimumTradesPerSegment,
        activeStrategy.minimumContributingSymbols,
      );
    }

    const latestRun = await this.backtestRunRepository.findOne({
      where: { symbol, timeframe, strategyVersion: activeStrategyVersion },
      order: { createdAt: "DESC" },
    });

    const symbolReadiness = this.evaluateRunReadiness(latestRun);
    if (!symbolReadiness.isReady) {
      return {
        ...symbolReadiness,
        strategyVersion: activeStrategyVersion,
      };
    }

    const portfolioRuns = await this.backtestRunRepository.find({
      where: { timeframe, strategyVersion: activeStrategyVersion },
      order: { createdAt: "DESC" },
    });
    const latestRunBySymbol = new Map<string, BacktestRun>();
    for (const run of portfolioRuns) {
      if (!latestRunBySymbol.has(run.symbol)) {
        latestRunBySymbol.set(run.symbol, run);
      }
    }
    const portfolioFailures = supportedTradingSymbols
      .map((requiredSymbol) => ({
        symbol: requiredSymbol,
        readiness: this.evaluateRunReadiness(
          latestRunBySymbol.get(requiredSymbol),
        ),
      }))
      .filter(({ readiness }) => !readiness.isReady);

    if (portfolioFailures.length > 0) {
      return {
        isReady: false,
        strategyVersion: activeStrategyVersion,
        runId: latestRun?.id,
        validation: latestRun?.result.validation,
        test: latestRun?.result.test,
        reason: `Portfolio approval blocked: ${portfolioFailures.map(({ symbol: failedSymbol, readiness }) => `${failedSymbol} (${readiness.reason})`).join("; ")}`,
      };
    }

    return {
      ...symbolReadiness,
      strategyVersion: activeStrategyVersion,
      reason:
        "Out-of-sample criteria passed for every supported trading symbol.",
    };
  }

  private async getPortfolioReadiness(
    timeframe: Timeframe,
    strategyVersion: string,
    minimumTradesPerSegment: number,
    minimumContributingSymbols: number,
  ) {
    const runs = await this.backtestRunRepository.find({
      where: { timeframe, strategyVersion },
      order: { createdAt: "DESC" },
    });
    const latestBySymbol = new Map<string, BacktestRun>();
    for (const run of runs) {
      if (!latestBySymbol.has(run.symbol)) latestBySymbol.set(run.symbol, run);
    }
    const members = supportedTradingSymbols.map((symbol) =>
      latestBySymbol.get(symbol),
    );
    const missing = supportedTradingSymbols.filter(
      (symbol) => !latestBySymbol.has(symbol),
    );
    if (missing.length > 0) {
      return {
        isReady: false,
        strategyVersion,
        reason: `Portfolio approval blocked: missing current runs for ${missing.join(", ")}.`,
      };
    }

    const completeRuns = members as BacktestRun[];
    const invalidRun = completeRuns.find(
      (run) =>
        !run.result.dataQuality?.primary?.isUsableForResearch ||
        (run.result.dataQuality?.higherTimeframe !== null &&
          !run.result.dataQuality?.higherTimeframe?.isUsableForResearch) ||
        !run.result.includesProtectedHoldout ||
        !run.result.protectedHoldout,
    );
    if (invalidRun) {
      return {
        isReady: false,
        strategyVersion,
        reason:
          "Portfolio approval blocked: every member needs a current, quality-approved run with a separate protected holdout.",
      };
    }

    const maxOpenPositions = this.getMaxPortfolioPositions();
    const aggregate = (segment: "validation" | "test" | "protectedHoldout") => {
      const eligibleTrades = completeRuns.flatMap((run) =>
        run.result.trades.filter((trade) => trade.segment === segment),
      );
      const acceptedTrades = applyPortfolioCapacity(
        eligibleTrades,
        maxOpenPositions,
      );
      const totalTrades = acceptedTrades.length;
      const totalR = acceptedTrades.reduce(
        (sum, trade) => sum + (trade.resultR ?? 0),
        0,
      );
      return {
        totalTrades,
        totalR,
        expectancyR: totalTrades === 0 ? 0 : totalR / totalTrades,
        contributingSymbols: new Set(
          acceptedTrades.map((trade) => trade.symbol),
        ).size,
      };
    };
    const validation = aggregate("validation");
    const test = aggregate("test");
    const protectedHoldout = aggregate("protectedHoldout");
    const segments = [validation, test, protectedHoldout];
    const isReady = segments.every(
      (segment) =>
        segment.totalTrades >= minimumTradesPerSegment &&
        segment.totalR > 0 &&
        segment.expectancyR > 0 &&
        segment.contributingSymbols >= minimumContributingSymbols,
    );

    return {
      isReady,
      strategyVersion,
      evaluationScope: "PORTFOLIO" as const,
      validation,
      test,
      protectedHoldout,
      reason: isReady
        ? "Capacity-constrained portfolio out-of-sample and protected-holdout criteria passed."
        : `Portfolio criteria failed: with at most ${maxOpenPositions} open position(s), require >=${minimumTradesPerSegment} trades, positive net R/expectancy, and >=${minimumContributingSymbols} contributing symbols in every segment.`,
    };
  }

  private getMaxPortfolioPositions(): number {
    const configured = Number(
      this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1),
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 1;
  }

  private evaluateRunReadiness(run?: BacktestRun | null) {
    if (!run) {
      return {
        isReady: false,
        reason: "No backtest exists for this strategy version.",
      };
    }

    const validation = run.result.validation;
    const test = run.result.test;
    const protectedHoldout = run.result.protectedHoldout;
    if (
      !run.result.dataQuality?.primary?.isUsableForResearch ||
      (run.result.dataQuality?.higherTimeframe !== null &&
        !run.result.dataQuality?.higherTimeframe?.isUsableForResearch)
    ) {
      return {
        isReady: false,
        reason: "Latest backtest has not passed the market-data quality gate.",
        runId: run.id,
      };
    }
    if (!run.result.includesProtectedHoldout) {
      return {
        isReady: false,
        reason: "Latest backtest did not include the protected final holdout.",
        runId: run.id,
      };
    }
    if (!validation || !test || !protectedHoldout) {
      return {
        isReady: false,
        reason:
          "Latest backtest was created before the protected-holdout gate was introduced.",
        runId: run.id,
      };
    }

    const isReady =
      validation.totalTrades >= 20 &&
      validation.totalR > 0 &&
      validation.expectancyR > 0 &&
      test.totalTrades >= 20 &&
      test.totalR > 0 &&
      test.expectancyR > 0 &&
      protectedHoldout.totalTrades >= 20 &&
      protectedHoldout.totalR > 0 &&
      protectedHoldout.expectancyR > 0;

    return {
      isReady,
      reason: isReady
        ? "Out-of-sample backtest criteria passed."
        : `Validation/test/holdout criteria failed: validationR=${validation.totalR.toFixed(2)}, testR=${test.totalR.toFixed(2)}, holdoutR=${protectedHoldout.totalR.toFixed(2)}.`,
      runId: run.id,
      validation,
      test,
      protectedHoldout,
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
        expectancyR: candidate.result.expectancyR - baseline.result.expectancyR,
        winRate: candidate.result.winRate - baseline.result.winRate,
        testTotalR: candidate.result.test.totalR - baseline.result.test.totalR,
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
