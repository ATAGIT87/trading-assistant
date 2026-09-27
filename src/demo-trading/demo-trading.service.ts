import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { StrategyRegistryService } from "../signals/strategy-registry.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { DemoPosition } from "./entities/demo-position.entity";
import { isAllowedSpotEntry } from "../trading/spot-trading-policy";

@Injectable()
export class DemoTradingService {
  constructor(
    @InjectRepository(DemoPosition)
    private readonly demoPositionRepository: Repository<DemoPosition>,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
    private readonly backtestingService: BacktestingService,
    private readonly strategyRegistry: StrategyRegistryService,
    private readonly configService: ConfigService,
  ) {}

  resolvePositionOutcome(
    position: Pick<
      DemoPosition,
      "side" | "entry" | "stopLoss" | "takeProfit" | "riskReward"
    >,
    candle: Pick<MarketCandle, "low" | "high">,
  ): {
    status: "OPEN" | "WIN" | "LOSS";
    exitPrice: number | null;
    resultR: number | null;
    exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
  } {
    const candleLow = Number(candle.low);
    const candleHigh = Number(candle.high);
    const stopLoss = Number(position.stopLoss);
    const takeProfit = Number(position.takeProfit);

    if (position.side === "BUY") {
      const stopTriggered = candleLow <= stopLoss;
      const takeTriggered = candleHigh >= takeProfit;

      if (stopTriggered && takeTriggered) {
        return {
          status: "LOSS",
          exitPrice: stopLoss,
          resultR: -1,
          exitReason: "STOP_LOSS",
        };
      }

      if (stopTriggered) {
        return {
          status: "LOSS",
          exitPrice: stopLoss,
          resultR: -1,
          exitReason: "STOP_LOSS",
        };
      }

      if (takeTriggered) {
        return {
          status: "WIN",
          exitPrice: takeProfit,
          resultR: position.riskReward ?? 1,
          exitReason: "TAKE_PROFIT",
        };
      }
    }

    return { status: "OPEN", exitPrice: null, resultR: null, exitReason: null };
  }

  async openPosition(
    symbol: string,
    timeframe: Timeframe,
    experimental = false,
  ) {
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

    const activeStrategy = this.configService.get(
      "ACTIVE_STRATEGY_VERSION",
      "",
    );
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
      const readiness = await this.backtestingService.getReadiness(
        symbol,
        timeframe,
      );
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

    const maxOpenPositions = experimental ? 1 : this.getMaxOpenPositions();
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

    const signal = await this.signalsService.getLiveV2Signal(symbol, timeframe);

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

    const risk = Math.abs(entry - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - entry);
    const investedAmount = Number(this.configService.get("DEMO_POSITION_SIZE_USDT", 100));
    const quantity = investedAmount / entry;
    const entryFee = investedAmount * Number(this.configService.get("BACKTESTING_FEE_RATE", 0.0005));

    const newPosition = this.demoPositionRepository.create({
      symbol,
      strategyVersion: activeStrategy || null,
      mode: experimental ? "EXPERIMENTAL" : "APPROVED",
      timeframe,
      side: signal.action,
      entry,
      quantity,
      investedAmount,
      entryFee,
      exitFee: 0,
      realizedPnlUsdt: null,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      riskReward: risk > 0 ? reward / risk : null,
      status: "OPEN",
      openedAt: entryCandleTime,
      closedAt: null,
      exitPrice: null,
      resultR: null,
      exitReason: null,
    });

    let savedPosition: DemoPosition;
    try {
      savedPosition = await this.demoPositionRepository.save(newPosition);
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
    const winningTrades = history.filter(
      (position) => position.status === "WIN",
    );
    const losingTrades = history.filter(
      (position) => position.status === "LOSS",
    );
    const totalR = history.reduce(
      (sum, position) => sum + Number(position.resultR ?? 0),
      0,
    );

    return {
      openPositions: (await this.getOpenPositions()).length,
      completedTrades: history.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        history.length === 0
          ? 0
          : (winningTrades.length / history.length) * 100,
      totalR,
      expectancyR: history.length === 0 ? 0 : totalR / history.length,
    };
  }

  private isDuplicateSignalError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    return (error.driverError as { code?: string }).code === "23505";
  }

  async checkOpenPositions() {
    const openPositions = await this.getOpenPositions();
    const processed: Array<{
      symbol: string;
      timeframe: Timeframe;
      side: "BUY";
      mode: DemoPosition["mode"];
      entry: number;
      stopLoss: number;
      takeProfit: number;
      status: "OPEN" | "WIN" | "LOSS";
      exitPrice: number | null;
      closedAt: Date | null;
      resultR: number | null;
      exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
      reason: string;
    }> = [];

    for (const position of openPositions) {
      const completedCandles = await this.getCompletedCandlesAfterOpen(
        position.symbol,
        position.timeframe,
        position.openedAt,
      );

      if (completedCandles.length === 0) {
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
          exitReason: null,
          reason:
            "No completed candle is available after the position opening time.",
        });
        continue;
      }

      let outcome: ReturnType<DemoTradingService["resolvePositionOutcome"]> = {
        status: "OPEN",
        exitPrice: null,
        resultR: null,
        exitReason: null,
      };
      let exitCandle: MarketCandle | null = null;
      const maxHoldingCandles = this.getMaxHoldingCandles(
        position.strategyVersion,
      );
      for (const [index, candle] of completedCandles.entries()) {
        outcome = this.resolvePositionOutcome(position, candle);
        if (outcome.status !== "OPEN") {
          exitCandle = candle;
          break;
        }
        if (index + 1 >= maxHoldingCandles) {
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

      if (outcome.status === "OPEN") {
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
          exitReason: null,
          reason:
            "No SL or TP threshold was reached in completed candles after the position opened.",
        });
        continue;
      }

      position.status = outcome.status;
      position.exitPrice = outcome.exitPrice;
      position.closedAt = new Date(exitCandle!.time);
      position.resultR = outcome.resultR;
      position.exitReason = outcome.exitReason;
      const exitValue = Number(position.quantity) * Number(outcome.exitPrice);
      position.exitFee = exitValue * Number(this.configService.get("BACKTESTING_FEE_RATE", 0.0005));
      position.realizedPnlUsdt = exitValue - Number(position.investedAmount) - Number(position.entryFee) - Number(position.exitFee);

      await this.demoPositionRepository.save(position);

      processed.push({
        symbol: position.symbol,
        timeframe: position.timeframe,
        side: position.side,
        mode: position.mode,
        entry: Number(position.entry),
        stopLoss: Number(position.stopLoss),
        takeProfit: Number(position.takeProfit),
        status: outcome.status,
        exitPrice: outcome.exitPrice,
        closedAt: position.closedAt,
        resultR: outcome.resultR,
        exitReason: outcome.exitReason,
        reason:
          outcome.exitReason === "TAKE_PROFIT"
            ? "Take profit threshold was reached."
            : outcome.exitReason === "STOP_LOSS"
              ? "Stop loss threshold was reached."
              : "Maximum holding time was reached.",
      });
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
  ): Promise<MarketCandle[]> {
    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    const durationMs = this.getTimeframeDurationMs(timeframe);
    return candles
      .filter((candle) => candle.time.getTime() + durationMs < Date.now())
      .filter((candle) => candle.time.getTime() > openedAt.getTime());
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

  private getMaxOpenPositions(): number {
    const configured = Number(
      this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1),
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 1;
  }

  private getMaxHoldingCandles(strategyVersion: string | null): number {
    if (!strategyVersion) return 48;
    try {
      return this.strategyRegistry.get(strategyVersion).maxHoldingCandles;
    } catch {
      return 48;
    }
  }
}
