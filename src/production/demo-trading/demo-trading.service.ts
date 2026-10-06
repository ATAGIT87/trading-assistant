import { MarketAnalysis } from "../trading/ccxt/analyze-market";
import { TradingSignal } from "../signals/signal.types";
import { savePositionWithNotification } from "./demo-notification-outbox";
import { findTradeOutcome } from "../trading/trade-outcome";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { StrategyApprovalService } from "../strategy-approval/strategy-approval.service";
import { getPositionExitPolicy } from "../trading/position-exit-policy";
import {
  rebaseSignalAtEntry,
  hasPositiveNetTarget,
} from "../trading/trade-execution";
import { getDemoPositionResult } from "./demo-position-result";
import { DemoPosition } from "./entities/demo-position.entity";
import { isAllowedSpotEntry } from "../trading/spot-trading-policy";
import { calculateSpotPositionSize } from "../trading/spot-position-sizing";

export interface DemoEntryResult {
  symbol: string;
  timeframe: Timeframe;
  action: TradingSignal["action"];
  reason: string;
  position: DemoPosition | null;
  signal?: TradingSignal;
}

@Injectable()
export class DemoTradingService {
  // Serialize entry/capacity and exit transitions in the supported single instance.
  private mutationQueue: Promise<unknown> = Promise.resolve();
  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const next = this.mutationQueue.then(work, work);
    this.mutationQueue = next.catch(() => undefined);
    return next;
  }
  constructor(
    @InjectRepository(DemoPosition)
    private readonly demoPositionRepository: Repository<DemoPosition>,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
    private readonly strategyApproval: StrategyApprovalService,
    private readonly configService: ConfigService,
  ) {}

  resolvePositionOutcome(
    position: Pick<
      DemoPosition,
      "side" | "entry" | "stopLoss" | "takeProfit" | "riskReward"
    >,
    candle: {
      low: number | string;
      high: number | string;
      open?: number | string;
    },
  ): {
    status: "OPEN" | "WIN" | "LOSS";
    exitPrice: number | null;
    resultR: number | null;
    exitReason:
      "STOP_LOSS" | "TAKE_PROFIT" | "PROFIT_PROTECTION" | "TIME_EXIT" | null;
  } {
    const candleLow = Number(candle.low);
    const candleHigh = Number(candle.high);
    const stopLoss = Number(position.stopLoss);
    const takeProfit = Number(position.takeProfit);

    if (position.side === "BUY") {
      const stopTriggered = candleLow <= stopLoss;
      const stopFill = Math.min(stopLoss, Number(candle.open ?? stopLoss));
      const takeTriggered = candleHigh >= takeProfit;

      if (stopTriggered && takeTriggered) {
        return {
          status: "LOSS",
          exitPrice: stopFill,
          resultR:
            (stopFill - Number(position.entry)) /
            (Number(position.entry) - stopLoss),
          exitReason: "STOP_LOSS",
        };
      }

      if (stopTriggered) {
        return {
          status: "LOSS",
          exitPrice: stopFill,
          resultR:
            (stopFill - Number(position.entry)) /
            (Number(position.entry) - stopLoss),
          exitReason: "STOP_LOSS",
        };
      }

      if (takeTriggered) {
        return {
          status: "WIN",
          exitPrice: takeProfit,
          resultR:
            (takeProfit - Number(position.entry)) /
            (Number(position.entry) - stopLoss),
          exitReason: "TAKE_PROFIT",
        };
      }
    }

    return { status: "OPEN", exitPrice: null, resultR: null, exitReason: null };
  }

  openPosition(
    symbol: string,
    timeframe: Timeframe,
    experimental = false,
  ): Promise<DemoEntryResult> {
    return this.signalsService
      .getMarketAnalysis(symbol, timeframe)
      .then((result) => this.openCcxtPosition(result, experimental));
  }

  private withEntryLock<T>(
    work: (service: DemoTradingService) => Promise<T>,
  ): Promise<T> {
    return this.demoPositionRepository.manager.transaction(async (manager) => {
      // All entry producers share a portfolio lock; capacity/balance reads use this transaction.
      await manager.query("SELECT pg_advisory_xact_lock(731905, 1)");
      const service = new DemoTradingService(
        manager.getRepository(DemoPosition),
        this.signalsService,
        this.marketDataService,
        this.strategyApproval,
        this.configService,
      );
      return work(service);
    });
  }

  openCcxtPosition(
    result: MarketAnalysis,
    experimental = true,
  ): Promise<DemoEntryResult> {
    if (!result.shouldBuy)
      return Promise.resolve({
        symbol: result.symbol.replace("/", ""),
        timeframe: result.timeframe as Timeframe,
        action: "NO_TRADE" as const,
        reason: result.reason,
        position: null,
      });
    return this.serialize(() =>
      this.withEntryLock(async (service) => {
        if (
          !result.shouldBuy ||
          !["BTC/EUR", "ETH/EUR"].includes(result.symbol) ||
          !this.signalsService.isUnifiedStrategyActive() ||
          result.timeframe !== "1h" ||
          !result.candle ||
          !result.closedHistory ||
          !result.atr14
        )
          throw new Error("Invalid closed-candle CCXT signal.");
        const end = result.candle.timestamp + 3_600_000;
        if (end > Date.now() || Date.now() >= end + 3_600_000)
          throw new Error("CCXT signal is not the latest closed candle.");
        const signal = this.signalsService.signalFromMarketAnalysis(result);
        // The exact snapshot is executed; no second strategy evaluation.
        return service.openPositionOnce(
          result.symbol.replace("/", ""),
          Timeframe.ONE_HOUR,
          experimental,
          signal,
          result.currentPrice,
        );
      }),
    );
  }

  private async openPositionOnce(
    symbol: string,
    timeframe: Timeframe,
    experimental = false,
    suppliedSignal?: TradingSignal,
    currentPrice?: number,
  ) {
    if (this.configService.get("DEMO_ENTRIES_PAUSED", "false") === "true") {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason:
          "New Demo entries are paused; existing positions remain monitored.",
        position: null,
      };
    }
    const experimentStart = new Date(
      this.configService.get<string>("EXPLORATORY_DEMO_START_AT", ""),
    );
    if (
      experimental &&
      (this.configService.get("EXPLORATORY_DEMO_ENABLED", "false") !== "true" ||
        !Number.isFinite(+experimentStart) ||
        Date.now() < +experimentStart)
    ) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "Exploratory Demo is disabled or not yet due.",
        position: null,
      };
    }
    if (
      !experimental &&
      this.configService.get("DEMO_TRADING_ENABLED", "false") !== "true"
    ) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "Demo position blocked: DEMO_TRADING_ENABLED is not true.",
        position: null,
      };
    }

    const configuredStrategy = this.configService.get(
      "ACTIVE_STRATEGY_VERSION",
      "",
    );
    const activeStrategy =
      suppliedSignal?.strategyVersion ?? configuredStrategy;
    const approvedStrategy = this.configService.get(
      "APPROVED_STRATEGY_VERSION",
      "",
    );
    if (
      !experimental &&
      (!approvedStrategy || approvedStrategy !== activeStrategy)
    ) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason:
          "Demo position blocked: the selected strategy is not explicitly approved.",
        position: null,
      };
    }

    if (!experimental) {
      const readiness = await this.strategyApproval.getReadiness(timeframe);
      if (!readiness.isReady) {
        return {
          symbol,
          timeframe,
          action: "NO_TRADE" as const,
          reason: `Demo position blocked: ${readiness.reason}`,
          position: null,
        };
      }
    }

    // Experimental Demo uses the same explicit portfolio capacity as approved
    // Demo. The mode labels evidence; it must not silently change risk limits.
    const maxOpenPositions = this.getMaxOpenPositions();
    const openPositions = await this.getOpenPositions();
    if (openPositions.length >= maxOpenPositions) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: `Demo position blocked: portfolio exposure limit (${maxOpenPositions} open Spot position).`,
        position: null,
      };
    }

    if (!suppliedSignal)
      throw new Error("An evaluated unified signal snapshot is required.");
    const signal = suppliedSignal;

    if (!isAllowedSpotEntry(signal.action)) {
      return {
        symbol,
        timeframe,
        action: signal.action,
        reason: signal.reason,
        position: null,
      };
    }

    const existingOpenPosition = await this.demoPositionRepository.findOne({
      where: {
        symbol,
        timeframe,
        status: "OPEN",
      },
    });

    if (existingOpenPosition) {
      return {
        symbol,
        timeframe,
        action: signal.action,
        signal,
        reason:
          "Duplicate open demo position prevented for this symbol/timeframe.",
        position: existingOpenPosition,
      };
    }

    if (signal.stopLoss === null || signal.takeProfit === null) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "Actionable signal is missing risk levels.",
        position: null,
      };
    }

    const entryCandleTime = new Date(
      signal.candleTime.getTime() + this.getTimeframeDurationMs(timeframe),
    );
    const entry = await this.marketDataService.getLiveCandleOpen(
      symbol,
      timeframe,
      entryCandleTime,
    );
    if (entry === null) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason:
          "The next candle open is not available for a forward Demo entry.",
        position: null,
      };
    }

    if (
      !Number.isFinite(entry) ||
      entry <= signal.stopLoss ||
      entry >= signal.takeProfit
    ) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "The next candle opened outside the signal risk levels.",
        position: null,
      };
    }

    const executableSignal = rebaseSignalAtEntry(signal, entry);
    if (
      executableSignal === null ||
      !hasPositiveNetTarget(
        executableSignal,
        this.getFeeRate(),
        this.getSlippageRate(),
      )
    ) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason:
          "The next candle has insufficient target room after structural limits and costs.",
        position: null,
      };
    }

    const risk = Math.abs(entry - executableSignal.stopLoss);
    const reward = Math.abs(executableSignal.takeProfit - entry);
    const positionSize = await this.calculatePositionSize(
      entry,
      executableSignal.stopLoss,
    );
    if (positionSize === null) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "Demo position blocked: no available EUR risk budget.",
        position: null,
      };
    }
    const { investedAmount, quantity, riskBudgetQuote, plannedRiskQuote } =
      positionSize;
    const entryFee = investedAmount * this.getFeeRate();

    const newPosition = this.demoPositionRepository.create({
      symbol,
      strategyVersion: activeStrategy || null,
      mode: experimental ? "EXPERIMENTAL" : "APPROVED",
      timeframe,
      side: signal.action,
      entry,
      quantity,
      investedAmount,
      riskBudgetQuote,
      plannedRiskQuote,
      entryFee,
      exitFee: 0,
      entrySlippage: investedAmount * this.getSlippageRate(),
      exitSlippage: 0,
      realizedPnlQuote: null,
      stopLoss: executableSignal.stopLoss,
      takeProfit: executableSignal.takeProfit,
      riskReward: risk > 0 ? reward / risk : null,
      status: "OPEN",
      openedAt: entryCandleTime,
      closedAt: null,
      exitPrice: null,
      resultR: null,
      maximumFavorableR: null,
      maximumAdverseR: null,
      exitReason: null,
    });

    let savedPosition: DemoPosition;
    try {
      savedPosition = await savePositionWithNotification(
        this.demoPositionRepository,
        newPosition,
        "OPEN",
        suppliedSignal
          ? {
              candleTime: signal.candleTime,
              reason: signal.reason,
              currentPrice,
            }
          : undefined,
      );
    } catch (error) {
      if (!this.isDuplicateSignalError(error)) {
        throw error;
      }

      const duplicate = await this.demoPositionRepository.findOne({
        where: {
          symbol,
          timeframe,
          strategyVersion: activeStrategy || null,
          openedAt: entryCandleTime,
        },
      });
      if (!duplicate) {
        throw error;
      }

      return {
        symbol,
        timeframe,
        action: signal.action,
        signal,
        reason: "Duplicate Demo signal prevented by the database constraint.",
        position: duplicate,
      };
    }

    return {
      symbol,
      timeframe,
      action: signal.action,
      signal,
      reason: experimental
        ? "Experimental Demo position opened from the current live signal."
        : "Approved Demo position opened from the current live signal.",
      position: savedPosition,
    };
  }

  async getOpenPositions(): Promise<DemoPosition[]> {
    return this.demoPositionRepository.find({
      where: { status: "OPEN" },
      order: { openedAt: "DESC" },
    });
  }

  async getHistory(): Promise<DemoPosition[]> {
    return this.demoPositionRepository.find({
      where: { status: In(["WIN", "LOSS"]) },
      order: { closedAt: "DESC" },
    });
  }

  async getSummary() {
    const history = await this.getHistory();
    const results = history.map(getDemoPositionResult);
    const winningTrades = results.filter(
      (position) => position.netResult === "WIN",
    );
    const losingTrades = results.filter(
      (position) => position.netResult === "LOSS",
    );
    const totalR = results.reduce(
      (sum, position) => sum + Number(position.resultR ?? 0),
      0,
    );
    const knownResults = results.filter(
      (result) => result.netResult !== "UNKNOWN",
    );
    const knownRiskResults = results.filter(
      (result) => result.resultR !== null,
    );

    const realizedPnlQuote = history.reduce(
      (sum, position) => sum + Number(position.realizedPnlQuote ?? 0),
      0,
    );
    const completedExcursions = history.filter(
      (position) =>
        position.maximumFavorableR !== null &&
        position.maximumAdverseR !== null,
    );
    const startingBalance = Number(
      this.configService.get("DEMO_STARTING_BALANCE_EUR", 1000),
    );

    return {
      openPositions: (await this.getOpenPositions()).length,
      completedTrades: history.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakevenTrades: results.filter(
        (position) => position.netResult === "BREAKEVEN",
      ).length,
      unknownResultTrades: results.filter(
        (position) => position.netResult === "UNKNOWN",
      ).length,
      winRate:
        knownResults.length === 0
          ? 0
          : (winningTrades.length / knownResults.length) * 100,
      totalR,
      expectancyR:
        knownRiskResults.length === 0 ? 0 : totalR / knownRiskResults.length,
      quoteCurrency: "EUR",
      realizedPnlQuote,
      startingBalance,
      estimatedBalance: startingBalance + realizedPnlQuote,
      averageMaximumFavorableR:
        completedExcursions.length === 0
          ? null
          : completedExcursions.reduce(
              (sum, position) => sum + Number(position.maximumFavorableR),
              0,
            ) / completedExcursions.length,
      averageMaximumAdverseR:
        completedExcursions.length === 0
          ? null
          : completedExcursions.reduce(
              (sum, position) => sum + Number(position.maximumAdverseR),
              0,
            ) / completedExcursions.length,
    };
  }

  private isDuplicateSignalError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    return (error.driverError as { code?: string }).code === "23505";
  }

  checkOpenPositions() {
    return this.serialize(() => this.checkOpenPositionsOnce());
  }

  private async checkOpenPositionsOnce() {
    const openPositions = await this.getOpenPositions();
    const processed: Array<{
      symbol: string;
      timeframe: Timeframe;
      side: "BUY";
      mode: DemoPosition["mode"];
      entry: number;
      stopLoss: number;
      effectiveStopLoss?: number;
      exitCandleTimeframe?: Timeframe | "1m";
      takeProfit: number;
      status: "OPEN" | "WIN" | "LOSS";
      exitPrice: number | null;
      closedAt: Date | null;
      resultR: number | null;
      netResult?: ReturnType<typeof getDemoPositionResult>["netResult"];
      realizedPnlQuote: number | null;
      maximumFavorableR: number | null;
      maximumAdverseR: number | null;
      exitReason:
        "STOP_LOSS" | "TAKE_PROFIT" | "PROFIT_PROTECTION" | "TIME_EXIT" | null;
      reason: string;
    }> = [];

    for (const position of openPositions) {
      try {
        const completedCandles = await this.getCompletedCandlesAfterOpen(
          position.symbol,
          position.timeframe,
          position.openedAt,
          Number(position.entry),
        );

        const now = Date.now();
        const duration = this.getTimeframeDurationMs(position.timeframe);
        const firstHourlyCandleStillForming =
          position.timeframe === Timeframe.ONE_HOUR &&
          +position.openedAt === Math.floor(now / duration) * duration;
        if (completedCandles.length === 0 && !firstHourlyCandleStillForming) {
          processed.push({
            symbol: position.symbol,
            timeframe: position.timeframe,
            side: position.side,
            mode: position.mode,
            entry: Number(position.entry),
            stopLoss: Number(position.stopLoss),
            takeProfit: Number(position.takeProfit),
            status: "OPEN",
            exitPrice: null,
            closedAt: null,
            resultR: null,
            realizedPnlQuote: null,
            maximumFavorableR: null,
            maximumAdverseR: null,
            exitReason: null,
            reason:
              "No valid contiguous completed entry-candle history is available; repair data before exit reconciliation.",
          });
          continue;
        }

        let outcome: ReturnType<DemoTradingService["resolvePositionOutcome"]> =
          {
            status: "OPEN",
            exitPrice: null,
            resultR: null,
            exitReason: null,
          };
        let exitCandle: { time: Date } | null = null;
        let exitCandleDurationMs = duration;
        let observedCandles: Array<{
          high: number | string;
          low: number | string;
        }> = [];
        const maxHoldingCandles = this.getMaxHoldingCandles(
          position.strategyVersion,
        );
        let effectiveStopLoss = Number(position.stopLoss);
        let protectProfit = false;
        const positionCosts = this.getPositionCosts(position);
        protectProfit = getPositionExitPolicy(
          position.strategyVersion,
        ).profitProtection;
        if (protectProfit) {
          const replay = findTradeOutcome(
            {
              action: "BUY",
              entryPrice: Number(position.entry),
              stopLoss: Number(position.stopLoss),
              takeProfit: Number(position.takeProfit),
              profitProtection: true,
            } as import("../signals/signal.types").TradingSignal,
            completedCandles,
            maxHoldingCandles ?? Number.MAX_SAFE_INTEGER,
            positionCosts.fee + positionCosts.slippage,
            Number(position.quantity) > 0
              ? (Number(position.entryFee) + Number(position.entrySlippage)) /
                  Number(position.quantity)
              : Number(position.entry) *
                  (this.getFeeRate() + this.getSlippageRate()),
          );
          effectiveStopLoss =
            replay.activeStopLoss ?? Number(position.stopLoss);
          observedCandles = completedCandles.slice(0, replay.durationCandles);
          if (replay.exitIndex !== null) {
            exitCandle = completedCandles[replay.exitIndex];
            outcome = {
              status: replay.result ? "WIN" : "LOSS",
              exitPrice: replay.exitPrice,
              resultR:
                replay.exitPrice === null
                  ? null
                  : (replay.exitPrice - Number(position.entry)) /
                    (Number(position.entry) - Number(position.stopLoss)),
              exitReason: replay.exitReason,
            };
          }
        }
        for (const [index, candle] of (protectProfit
          ? []
          : completedCandles
        ).entries()) {
          observedCandles.push(candle);
          outcome = this.resolvePositionOutcome(position, candle);
          if (outcome.status !== "OPEN") {
            exitCandle = candle;
            break;
          }
          if (maxHoldingCandles !== null && index + 1 >= maxHoldingCandles) {
            const exitPrice = Number(candle.close);
            const entry = Number(position.entry);
            const risk = Math.abs(entry - Number(position.stopLoss));
            const resultR = risk > 0 ? (exitPrice - entry) / risk : 0;
            outcome = {
              status: resultR >= 0 ? "WIN" : "LOSS",
              exitPrice,
              resultR,
              exitReason: "TIME_EXIT",
            };
            exitCandle = candle;
            break;
          }
        }

        let monitoringReason =
          "No SL or TP threshold was reached in completed candles after the position opened.";
        if (
          outcome.status === "OPEN" &&
          position.timeframe === Timeframe.ONE_HOUR
        ) {
          const minuteStart = new Date(
            +position.openedAt + completedCandles.length * duration,
          );
          const currentHourStart = Math.floor(now / duration) * duration;
          if (+minuteStart === currentHourStart) {
            // Replay the still-open hour from its first CLOSED minute. No minute bar is stored as 1h data.
            const minuteCandles =
              await this.marketDataService.getClosedMinuteCandles(
                position.symbol,
                minuteStart,
                completedCandles.length === 0
                  ? Number(position.entry)
                  : undefined,
              );
            for (const candle of minuteCandles) {
              observedCandles.push(candle);
              const minuteOutcome = this.resolvePositionOutcome(
                { ...position, stopLoss: effectiveStopLoss },
                candle,
              );
              if (minuteOutcome.status !== "OPEN") {
                outcome = {
                  ...minuteOutcome,
                  resultR:
                    minuteOutcome.exitPrice === null
                      ? null
                      : (minuteOutcome.exitPrice - Number(position.entry)) /
                        (Number(position.entry) - Number(position.stopLoss)),
                  exitReason:
                    minuteOutcome.exitReason === "STOP_LOSS" &&
                    effectiveStopLoss > Number(position.stopLoss)
                      ? "PROFIT_PROTECTION"
                      : minuteOutcome.exitReason,
                };
                exitCandle = candle;
                exitCandleDurationMs = 60_000;
                break;
              }
            }
            monitoringReason =
              "No SL or TP threshold was reached; the current hour was monitored using closed 1m candles.";
          } else {
            monitoringReason =
              "Minute exit monitoring blocked by missing or stale hourly history; repair data before advancing the exit cursor.";
          }
        }

        if (outcome.status === "OPEN") {
          const excursions = this.calculateExcursions(
            position,
            observedCandles,
          );
          position.maximumFavorableR = excursions.maximumFavorableR;
          position.maximumAdverseR = excursions.maximumAdverseR;
          await this.demoPositionRepository.save(position);
          processed.push({
            symbol: position.symbol,
            timeframe: position.timeframe,
            side: position.side,
            mode: position.mode,
            entry: Number(position.entry),
            stopLoss: Number(position.stopLoss),
            effectiveStopLoss,
            takeProfit: Number(position.takeProfit),
            status: "OPEN",
            exitPrice: null,
            closedAt: null,
            resultR: null,
            realizedPnlQuote: null,
            maximumFavorableR: excursions.maximumFavorableR,
            maximumAdverseR: excursions.maximumAdverseR,
            exitReason: null,
            reason: monitoringReason,
          });
          continue;
        }

        position.status = outcome.status;
        position.exitPrice = outcome.exitPrice;
        position.closedAt = new Date(+exitCandle!.time + exitCandleDurationMs);
        position.exitReason = outcome.exitReason;
        const excursions = this.calculateExcursions(position, observedCandles);
        position.maximumFavorableR = excursions.maximumFavorableR;
        position.maximumAdverseR = excursions.maximumAdverseR;
        const exitValue = Number(position.quantity) * Number(outcome.exitPrice);
        position.exitFee = exitValue * positionCosts.fee;
        position.exitSlippage = exitValue * positionCosts.slippage;
        position.realizedPnlQuote =
          exitValue -
          Number(position.investedAmount) -
          Number(position.entryFee) -
          Number(position.exitFee) -
          Number(position.entrySlippage) -
          Number(position.exitSlippage);

        const netOutcome = getDemoPositionResult(position);
        position.resultR = netOutcome.resultR;
        // Keep the existing PostgreSQL enum: exactly flat closes retain WIN as
        // a legacy storage bucket; API/Telegram report BREAKEVEN explicitly.
        position.status = netOutcome.netResult === "LOSS" ? "LOSS" : "WIN";

        await savePositionWithNotification(
          this.demoPositionRepository,
          position,
          "CLOSE",
        );

        processed.push({
          symbol: position.symbol,
          timeframe: position.timeframe,
          side: position.side,
          mode: position.mode,
          entry: Number(position.entry),
          stopLoss: Number(position.stopLoss),
          takeProfit: Number(position.takeProfit),
          status: position.status,
          exitPrice: outcome.exitPrice,
          closedAt: position.closedAt,
          exitCandleTimeframe:
            exitCandleDurationMs === 60_000 ? "1m" : position.timeframe,
          resultR: position.resultR,
          netResult: netOutcome.netResult,
          realizedPnlQuote: Number(position.realizedPnlQuote),
          maximumFavorableR: excursions.maximumFavorableR,
          maximumAdverseR: excursions.maximumAdverseR,
          exitReason: outcome.exitReason,
          reason:
            outcome.exitReason === "TAKE_PROFIT"
              ? "Take profit threshold was reached."
              : outcome.exitReason === "STOP_LOSS"
                ? "Stop loss threshold was reached."
                : outcome.exitReason === "PROFIT_PROTECTION"
                  ? "The profit-protection stop was reached."
                  : "Maximum holding time was reached.",
        });
      } catch {
        processed.push({
          symbol: position.symbol,
          timeframe: position.timeframe,
          side: position.side,
          mode: position.mode,
          entry: Number(position.entry),
          stopLoss: Number(position.stopLoss),
          takeProfit: Number(position.takeProfit),
          status: "OPEN",
          exitPrice: null,
          closedAt: null,
          resultR: null,
          realizedPnlQuote: null,
          maximumFavorableR: null,
          maximumAdverseR: null,
          exitReason: null,
          reason:
            "Exit reconciliation failed; the persisted position will be checked again on a later cycle.",
        });
      }
    }

    return {
      checkedAt: new Date(),
      processed,
    };
  }

  private async getCompletedCandlesAfterOpen(
    symbol: string,
    timeframe: Timeframe,
    openedAt: Date,
    expectedEntry?: number,
  ): Promise<MarketCandle[]> {
    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    const durationMs = this.getTimeframeDurationMs(timeframe);
    if (candles.some((candle) => !Number.isFinite(+candle.time))) return [];
    const sorted = candles
      .filter((c) => +c.time >= +openedAt && +c.time + durationMs <= Date.now())
      .sort((a, b) => +a.time - +b.time);
    const contiguous: MarketCandle[] = [];
    for (const [index, candle] of sorted.entries()) {
      const expected = +openedAt + contiguous.length * durationMs;
      const values = [candle.open, candle.high, candle.low, candle.close].map(
        Number,
      );
      const [open, high, low, close] = values;
      if (
        (index === 0 &&
          expectedEntry !== undefined &&
          Math.abs(open - expectedEntry) > 1e-7) ||
        +sorted[index + 1]?.time === +candle.time ||
        +candle.time !== expected ||
        expected % durationMs !== 0 ||
        !values.every(Number.isFinite) ||
        low <= 0 ||
        high < Math.max(open, close) ||
        low > Math.min(open, close)
      )
        break;
      contiguous.push(candle);
    }
    // Never bridge an unknown interval or reinterpret a later candle as the entry bar.
    return contiguous;
  }

  private getTimeframeDurationMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case Timeframe.FIFTEEN_MINUTES:
        return 15 * 60 * 1000;
      case Timeframe.ONE_HOUR:
        return 60 * 60 * 1000;
      case Timeframe.FOUR_HOURS:
        return 4 * 60 * 60 * 1000;
      case Timeframe.ONE_DAY:
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private calculateExcursions(
    position: Pick<DemoPosition, "entry" | "stopLoss">,
    candles: Array<{ high: number | string; low: number | string }>,
  ): { maximumFavorableR: number | null; maximumAdverseR: number | null } {
    if (candles.length === 0) {
      return { maximumFavorableR: null, maximumAdverseR: null };
    }
    const entry = Number(position.entry);
    const risk = Math.abs(entry - Number(position.stopLoss));
    if (!Number.isFinite(risk) || risk <= 0) {
      return { maximumFavorableR: null, maximumAdverseR: null };
    }
    const highest = Math.max(...candles.map((candle) => Number(candle.high)));
    const lowest = Math.min(...candles.map((candle) => Number(candle.low)));
    return {
      maximumFavorableR: (highest - entry) / risk,
      maximumAdverseR: (lowest - entry) / risk,
    };
  }

  private getPositionCosts(position: DemoPosition) {
    const invested = Number(position.investedAmount);
    const fee = Number(position.entryFee) / invested;
    const slippage = Number(position.entrySlippage) / invested;
    return {
      fee:
        invested > 0 && Number.isFinite(fee) && fee >= 0
          ? fee
          : this.getFeeRate(),
      slippage:
        invested > 0 && Number.isFinite(slippage) && slippage >= 0
          ? slippage
          : this.getSlippageRate(),
    };
  }

  private getSlippageRate(): number {
    const rate = Number(
      this.configService.get("BACKTESTING_SLIPPAGE_RATE", 0.0005),
    );
    return Number.isFinite(rate) && rate >= 0 ? rate : 0.0005;
  }

  private getFeeRate(): number {
    const rate = Number(this.configService.get("BACKTESTING_FEE_RATE", 0.0005));
    return Number.isFinite(rate) && rate >= 0 ? rate : 0.0005;
  }

  private async calculatePositionSize(entry: number, stopLoss: number) {
    const history = await this.getHistory();
    const realizedPnl = history.reduce(
      (sum, position) => sum + Number(position.realizedPnlQuote ?? 0),
      0,
    );
    const openPositions = await this.getOpenPositions();
    const committedCapital = openPositions.reduce(
      (sum, position) =>
        sum +
        Number(position.investedAmount) +
        Number(position.entryFee) +
        Number(position.entrySlippage),
      0,
    );
    const startingBalance = Number(
      this.configService.get("DEMO_STARTING_BALANCE_EUR", 1000),
    );
    const availableQuoteBalance =
      startingBalance + realizedPnl - committedCapital;
    const riskPerTradePercent = Number(
      this.configService.get("DEMO_RISK_PER_TRADE_PERCENT", 0.01),
    );
    const maximumInvestedAmount = Number(
      this.configService.get("DEMO_POSITION_SIZE_EUR", 100),
    );
    return calculateSpotPositionSize(
      entry,
      stopLoss,
      availableQuoteBalance,
      Math.min(riskPerTradePercent, 0.01),
      Math.min(maximumInvestedAmount, 100),
      this.getFeeRate() + this.getSlippageRate(),
    );
  }

  private getMaxOpenPositions(): number {
    const configured = Number(
      this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1),
    );
    return Number.isInteger(configured) && configured > 0
      ? Math.min(configured, 2)
      : 1;
  }

  private getMaxHoldingCandles(strategyVersion: string | null): number | null {
    return getPositionExitPolicy(strategyVersion).maxHoldingCandles;
  }
}
