import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { timeframeDurationMs } from "../../../src/production/assets/timeframe.utils";
import { getHigherTimeframe } from "../data/higher-timeframe";
import { MarketDataService } from "../../../src/production/market-data/market-data.service";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { supportedTradingSymbols } from "../../../src/production/market-data/trading-symbol";
import { ResearchStrategyRegistryService } from "../strategies/research-strategy-registry.service";
import { EVIDENCE_ENGINE_VERSION } from "../../../src/production/strategy-approval/evidence-engine";
import { StrategyEvidenceResult } from "../../../src/production/strategy-approval/evidence-result";
import { StrategyEvidenceTrade } from "../../../src/production/strategy-approval/evidence-trade";
import { findTradeOutcome } from "../../../src/production/trading/trade-outcome";
import { hasPositiveNetTarget } from "../../../src/production/trading/trade-execution";
import { executeSignalAtNextOpen } from "./helpers/historical-entry.helper";
import { classifyNetResult } from "../../../src/production/trading/net-trade-result";
import { calculateBacktestStatistics } from "./helpers/backtest-statistics.helper";
import { calculateBacktestSummary } from "./helpers/backtest-summary.helper";
import { StrategyEvidence } from "../../../src/production/strategy-approval/entities/strategy-evidence.entity";
import { isAllowedSpotEntry } from "../../../src/production/trading/spot-trading-policy";
import { aggregatePortfolioBacktests } from "./helpers/portfolio-backtest.helper";
import { applyPortfolioCapacity } from "./helpers/portfolio-capacity.helper";
import { PortfolioBacktestResult } from "./interfaces/portfolio-backtest-result.interface";
import { WalkForwardPortfolioResult } from "./interfaces/walk-forward-result.interface";
import { buildWalkForwardWindows } from "./helpers/walk-forward.helper";
import { buildBacktestPeriods } from "./helpers/backtest-periods.helper";
import {
  assessMarketDataQuality,
  getLatestContinuousCandleSegment,
} from "../../../src/production/market-data/market-data-quality";

@Injectable()
export class BacktestingService {
  private readonly engineVersion = EVIDENCE_ENGINE_VERSION;
  private readonly feeRate: number;
  private readonly slippageRate: number;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly strategyRegistry: ResearchStrategyRegistryService,
    private readonly configService: ConfigService,
    @InjectRepository(StrategyEvidence)
    private readonly backtestRunRepository: Repository<StrategyEvidence>,
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
  ): Promise<StrategyEvidenceResult> {
    const evaluatedAt = new Date();
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
      evaluatedAt.getTime() - holdoutDays * 24 * 60 * 60 * 1000,
    );
    const allCandles = (
      await this.marketDataService.getHistoricalCandles(symbol, timeframe)
    ).filter(
      (candle) =>
        candle.time.getTime() + timeframeDurationMs[timeframe] <=
        evaluatedAt.getTime(),
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
        : await this.marketDataService
            .getHistoricalCandles(symbol, higherTimeframe)
            .then((rows) =>
              rows.filter(
                (candle) =>
                  candle.time.getTime() +
                    timeframeDurationMs[higherTimeframe] <=
                  evaluatedAt.getTime(),
              ),
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
      evaluatedAt,
      strategy.minimumHistory,
    );
    const higherTimeframeDataQuality =
      higherTimeframe === null
        ? null
        : assessMarketDataQuality(
            symbol,
            higherTimeframe,
            higherTimeframeCandles,
            evaluatedAt,
            strategy.minimumHigherTimeframeHistory ?? strategy.minimumHistory,
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
      engineVersion: this.engineVersion,
      executionResolution: timeframe,
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

    // An explicit includeHoldout run is allowed to evaluate recent data even
    // when every available candle falls inside the normal protected holdout.
    // The old selection-only guard returned an empty result for exactly that
    // case, despite sufficient candles and valid raw setups.
    const evaluationCandles = includeProtectedHoldout
      ? candles.length
      : periods.selectionTestEndIndex;
    if (evaluationCandles < strategy.minimumHistory + 2) {
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

    const trades: StrategyEvidenceTrade[] = [];
    const trainingTrades: StrategyEvidenceTrade[] = [];
    const validationTrades: StrategyEvidenceTrade[] = [];
    const testTrades: StrategyEvidenceTrade[] = [];
    const protectedHoldoutTrades: StrategyEvidenceTrade[] = [];

    let grossTotalR = 0;
    let totalFeeR = 0;
    let totalSlippageR = 0;

    const processSegment = async (
      startIndex: number,
      endIndex: number,
      targetTrades: StrategyEvidenceTrade[],
      segment: StrategyEvidenceTrade["segment"],
    ) => {
      let i = Math.max(startIndex, strategy.minimumHistory - 1);
      let higherTimeframeEndIndex = 0;

      while (i < endIndex) {
        const historicalCandles = candles.slice(0, i + 1);

        while (
          higherTimeframe !== null &&
          higherTimeframeEndIndex < higherTimeframeCandles.length &&
          higherTimeframeCandles[higherTimeframeEndIndex].time.getTime() +
            timeframeDurationMs[higherTimeframe] <=
            candles[i].time.getTime() + timeframeDurationMs[timeframe]
        ) {
          higherTimeframeEndIndex++;
        }

        const higherTimeframeTrend =
          higherTimeframe === null
            ? undefined
            : strategy.getTrend(
                higherTimeframeCandles.slice(0, higherTimeframeEndIndex),
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

        if (
          signal === null ||
          !hasPositiveNetTarget(signal, this.feeRate, this.slippageRate)
        ) {
          i++;
          continue;
        }

        const outcome = findTradeOutcome(
          signal,
          futureCandles,
          strategy.maxHoldingCandles,
          this.feeRate + this.slippageRate,
        );

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

        const backtestTrade: StrategyEvidenceTrade = {
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

          result: classifyNetResult(netR),

          exitReason: outcome.exitReason,

          exitTime:
            outcome.exitIndex === null
              ? null
              : new Date(
                  +futureCandles[outcome.exitIndex].time +
                    timeframeDurationMs[timeframe],
                ),

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

        // The exit candle is closed when the next decision is made. Live Demo
        // checks exits first and can then enter at the following candle open.
        i = i + outcome.exitIndex + 1;
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

    const completedTrades = trades.filter(
      (trade) => trade.resultR !== null,
    ).length;

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
    const results: Array<{ symbol: string; result: StrategyEvidenceResult }> =
      [];

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
    strategy: ReturnType<ResearchStrategyRegistryService["get"]>,
  ) {
    const evaluatedAt = new Date();
    const holdoutDays = Math.floor(
      this.getNumericConfigValue("BACKTEST_HOLDOUT_DAYS", 365),
    );
    const protectedHoldoutStart = new Date(
      evaluatedAt.getTime() - holdoutDays * 24 * 60 * 60 * 1000,
    );
    const candles = this.toNumericCandles(
      getLatestContinuousCandleSegment(
        (
          await this.marketDataService.getHistoricalCandles(symbol, timeframe)
        ).filter(
          (candle) =>
            candle.time < protectedHoldoutStart &&
            candle.time.getTime() + timeframeDurationMs[timeframe] <=
              evaluatedAt.getTime(),
        ),
        timeframe,
      ),
    );
    const higherTimeframe = strategy.requiresHigherTimeframeConfirmation
      ? getHigherTimeframe(timeframe)
      : null;
    const higherCandles =
      higherTimeframe === null
        ? []
        : this.toNumericCandles(
            getLatestContinuousCandleSegment(
              (
                await this.marketDataService.getHistoricalCandles(
                  symbol,
                  higherTimeframe,
                )
              ).filter(
                (candle) =>
                  candle.time < protectedHoldoutStart &&
                  candle.time.getTime() +
                    timeframeDurationMs[higherTimeframe] <=
                    evaluatedAt.getTime(),
              ),
              higherTimeframe,
            ),
          );
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
    strategy: ReturnType<ResearchStrategyRegistryService["get"]>,
    startIndex: number,
    endIndex: number,
  ): StrategyEvidenceTrade[] {
    const trades: StrategyEvidenceTrade[] = [];
    let i = Math.max(startIndex, strategy.minimumHistory - 1);
    if (i >= endIndex) return trades;
    let higherIndex = 0;
    while (
      higherTimeframe !== null &&
      higherIndex < higherCandles.length &&
      higherCandles[higherIndex].time.getTime() +
        timeframeDurationMs[higherTimeframe] <=
        candles[i].time.getTime() + timeframeDurationMs[timeframe]
    ) {
      higherIndex++;
    }

    while (i < endIndex) {
      const historical = candles.slice(0, i + 1);
      while (
        higherTimeframe !== null &&
        higherIndex < higherCandles.length &&
        higherCandles[higherIndex].time.getTime() +
          timeframeDurationMs[higherTimeframe] <=
          candles[i].time.getTime() + timeframeDurationMs[timeframe]
      ) {
        higherIndex++;
      }
      const higherTrend =
        higherTimeframe === null
          ? undefined
          : strategy.getTrend(higherCandles.slice(0, higherIndex));
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
      if (
        signal === null ||
        !hasPositiveNetTarget(signal, this.feeRate, this.slippageRate)
      ) {
        i++;
        continue;
      }
      const outcome = findTradeOutcome(
        signal,
        future,
        strategy.maxHoldingCandles,
        this.feeRate + this.slippageRate,
      );
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
        result: classifyNetResult(grossR === null ? null : grossR - costR),
        exitReason: outcome.exitReason,
        exitTime:
          outcome.exitIndex === null
            ? null
            : new Date(
                +future[outcome.exitIndex].time +
                  timeframeDurationMs[timeframe],
              ),
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
      i += outcome.exitIndex + 1;
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
    exitReason:
      "STOP_LOSS" | "TAKE_PROFIT" | "PROFIT_PROTECTION" | "TIME_EXIT" | null,
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

  async findRuns(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<StrategyEvidence[]> {
    return this.backtestRunRepository.find({
      where: { symbol, timeframe },
      order: { createdAt: "DESC" },
      take: 20,
    });
  }

  private getMaxPortfolioPositions(): number {
    const configured = Number(
      this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1),
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 1;
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
    result: StrategyEvidenceResult,
  ): Promise<StrategyEvidenceResult> {
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
