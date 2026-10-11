import { AlertDelivery } from "../alerts/entities/alert-delivery.entity";
import {
  SPOT_STRATEGY_VERSION,
  LEGACY_DAILY_SPOT_STRATEGY_VERSION,
  FOUR_HOURS_MS,
  ONE_HOUR_MS,
  evaluateMacroTrend,
} from "../trading/ccxt/analyze-market";
import { supportedTradingSymbols } from "../market-data/trading-symbol";
import {
  MAKER_FEE_RATE,
  STOP_MARKET_FEE_RATE,
  STOP_MARKET_SLIPPAGE_RATE,
  MARKET_STOP_BREAK_EVEN_CUSHION,
  MAX_SPOT_POSITIONS,
  isPassiveLimit,
  makerEntryWindow,
  fillMakerBuy,
  validMakerBar,
} from "../trading/maker-execution";
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
          !supportedTradingSymbols.some(
            (symbol) => symbol === result.symbol.replace("/", ""),
          ) ||
          !this.signalsService.isUnifiedStrategyActive() ||
          result.timeframe !== "4h" ||
          !result.candle ||
          !result.closedHistory ||
          !result.atr14
        )
          throw new Error("Invalid closed-candle CCXT signal.");
        const end = result.candle.timestamp + FOUR_HOURS_MS;
        if (end > Date.now() || Date.now() >= end + FOUR_HOURS_MS)
          throw new Error("CCXT signal is not the latest closed candle.");
        const signal = this.signalsService.signalFromMarketAnalysis(result);
        // The exact snapshot is executed; no second strategy evaluation.
        return service.openPositionOnce(
          result.symbol.replace("/", ""),
          Timeframe.FOUR_HOURS,
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
    filledOrder?: {
      order: AlertDelivery;
      bar: MarketCandle;
      executionTimeframe: Timeframe;
    },
  ) {
    if (
      !filledOrder &&
      this.configService.get("DEMO_ENTRIES_PAUSED", "false") === "true"
    ) {
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
      !filledOrder &&
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
      !filledOrder &&
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
      !filledOrder &&
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

    if (!filledOrder && !experimental) {
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
    const maxOpenPositions = MAX_SPOT_POSITIONS;
    const pendingOrders = await this.getPendingMakerOrders();
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
        position: filledOrder ? null : existingOpenPosition,
      };
    }

    if (!filledOrder && pendingOrders.some((order) => order.symbol === symbol))
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        position: null,
        reason:
          "This asset already has a pending Maker entry; no duplicate commitment is admitted.",
      };

    if (signal.stopLoss === null || signal.takeProfit === null) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "Actionable signal is missing risk levels.",
        position: null,
      };
    }

    if (
      (!filledOrder && signal.strategyVersion !== SPOT_STRATEGY_VERSION) ||
      signal.executionPolicy !== "MAKER_ONLY" ||
      (!filledOrder && timeframe !== Timeframe.FOUR_HOURS)
    )
      throw new Error("ONLY_POST_ONLY_4H_LIMIT_ENTRIES_ALLOWED");
    let entry = signal.entryPrice;
    if (!filledOrder) {
      const quote = await this.marketDataService.getBestBidAsk(symbol);
      entry = Math.min(entry, quote.bid);
      if (!isPassiveLimit("BUY", entry, quote.bid, quote.ask))
        throw new Error("MARKETABLE_POST_ONLY_ENTRY_REJECTED");
    }
    const executableSignal = rebaseSignalAtEntry(signal, entry);
    if (
      !executableSignal ||
      !hasPositiveNetTarget(executableSignal, MAKER_FEE_RATE, 0)
    )
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        position: null,
        reason:
          "Maker limit has insufficient net target after 0.40% fees per side.",
      };
    const entryCandleTime = filledOrder
      ? new Date(
          +filledOrder.bar.time +
            (filledOrder.executionTimeframe === Timeframe.FOUR_HOURS
              ? FOUR_HOURS_MS
              : ONE_HOUR_MS),
        )
      : new Date(signal.candleTime.getTime() + FOUR_HOURS_MS);

    const risk = Math.abs(entry - executableSignal.stopLoss);
    const reward = Math.abs(executableSignal.takeProfit - entry);
    const positionSize =
      filledOrder?.order.payload?.makerEntry ??
      (await this.calculatePositionSize(
        entry,
        executableSignal.stopLoss,
        executableSignal.stopExecutionPolicy === "MARKET_STOP",
      ));
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
    if (!filledOrder) {
      const seen = await this.demoPositionRepository.manager
        .getRepository(AlertDelivery)
        .find({
          where: {
            symbol,
            timeframe,
            candleTime: signal.candleTime,
            action: "CCXT_SIGNAL_COMMITTED",
          },
        });
      if (seen.length)
        return {
          symbol,
          timeframe,
          action: "NO_TRADE" as const,
          position: null,
          reason: "This closed-candle Maker signal was already submitted.",
        };
    }
    if (!filledOrder) {
      const postedAt = Date.now(),
        window = makerEntryWindow(postedAt);
      await this.demoPositionRepository.manager.insert(AlertDelivery, {
        symbol,
        timeframe,
        candleTime: signal.candleTime,
        action: "CCXT_SIGNAL_COMMITTED",
      });
      await this.demoPositionRepository.manager.insert(AlertDelivery, {
        symbol,
        timeframe,
        candleTime: signal.candleTime,
        action: "MAKER_ENTRY_PENDING",
        payload: {
          reason: signal.reason,
          currentPrice,
          makerEntry: {
            executionTimeframe: Timeframe.ONE_HOUR,
            signal: executableSignal,
            postedAt,
            expiresAt: window.expiresAt,
            experimental,
            investedAmount,
            quantity,
            riskBudgetQuote,
            plannedRiskQuote,
          },
        },
      });
      return {
        symbol,
        timeframe,
        action: "BUY" as const,
        signal: executableSignal,
        position: null,
        reason:
          "Post-only limit queued; quote capital is reserved for at most 24 hours; pending orders do not occupy position capacity.",
      };
    }
    const entryFee = investedAmount * MAKER_FEE_RATE;

    const newPosition = this.demoPositionRepository.create({
      symbol,
      strategyVersion: activeStrategy || null,
      mode: experimental ? "EXPERIMENTAL" : "APPROVED",
      timeframe,
      executionTimeframe:
        filledOrder.executionTimeframe === Timeframe.ONE_HOUR
          ? Timeframe.ONE_HOUR
          : null,
      side: signal.action,
      stopExecutionPolicy: executableSignal.stopExecutionPolicy ?? null,
      entry,
      quantity,
      investedAmount,
      riskBudgetQuote,
      plannedRiskQuote,
      entryFee,
      exitFee: 0,
      entrySlippage: 0,
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
        undefined,
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
        ? "Experimental Demo Maker limit filled by the closed-bar proxy."
        : "Approved Demo Maker limit filled by the closed-bar proxy.",
      position: savedPosition,
    };
  }

  getPendingMakerOrders(): Promise<AlertDelivery[]> {
    return this.demoPositionRepository.manager
      .getRepository(AlertDelivery)
      .find({
        where: { action: "MAKER_ENTRY_PENDING" },
        order: { sentAt: "ASC" },
      });
  }

  getMakerExecutionTimeframe(order: AlertDelivery): Timeframe {
    // Existing pending orders have no completed position; use hourly data for the
    // current strategy too. Older strategies retain their stored execution rules.
    return (
      order.payload?.makerEntry?.executionTimeframe ??
      ([SPOT_STRATEGY_VERSION, LEGACY_DAILY_SPOT_STRATEGY_VERSION].includes(
        order.payload?.makerEntry?.signal.strategyVersion ?? "",
      )
        ? Timeframe.ONE_HOUR
        : order.timeframe)
    );
  }

  getMakerMacroTimeframe(order: AlertDelivery): Timeframe {
    return [SPOT_STRATEGY_VERSION, LEGACY_DAILY_SPOT_STRATEGY_VERSION].includes(
      order.payload?.makerEntry?.signal.strategyVersion ?? "",
    )
      ? Timeframe.ONE_DAY
      : Timeframe.FOUR_HOURS;
  }

  private async reconcileMakerEntries() {
    for (const order of await this.getPendingMakerOrders()) {
      const pending = order.payload?.makerEntry;
      if (!pending) throw new Error("INVALID_PERSISTED_MAKER_ENTRY");
      if ((await this.getOpenPositions()).length >= MAX_SPOT_POSITIONS) {
        order.action = "MAKER_ENTRY_CANCELLED";
        await this.demoPositionRepository.manager.save(AlertDelivery, order);
        continue;
      }
      const executionTimeframe = this.getMakerExecutionTimeframe(order);
      const duration =
        executionTimeframe === Timeframe.FOUR_HOURS
          ? FOUR_HOURS_MS
          : ONE_HOUR_MS;
      const signal = {
        ...pending.signal,
        executionPolicy: "MAKER_ONLY" as const,
        candleTime: new Date(pending.signal.candleTime),
      };
      const window = makerEntryWindow(pending.postedAt, duration),
        expiresAt = Math.min(pending.expiresAt, window.expiresAt),
        now = Date.now();
      const rows = (
        await this.marketDataService.getHistoricalCandles(
          order.symbol,
          executionTimeframe,
        )
      )
        .filter(
          (c) =>
            +c.time >= window.eligibleAt &&
            +c.time + duration <= Math.min(expiresAt, now),
        )
        .sort((a, b) => +a.time - +b.time);
      if (
        rows.some(
          (bar, index) =>
            !validMakerBar(bar, duration) ||
            (index > 0 && +rows[index - 1].time === +bar.time),
        )
      )
        continue;
      const macroTimeframe = this.getMakerMacroTimeframe(order);
      const macroDuration =
        macroTimeframe === Timeframe.ONE_DAY ? 86_400_000 : FOUR_HOURS_MS;
      const macros = await this.marketDataService.getHistoricalCandles(
        order.symbol,
        macroTimeframe,
      );
      let observed = 0,
        terminal = false;
      for (const bar of rows) {
        if (
          !validMakerBar(bar, duration) ||
          +bar.time !== window.eligibleAt + observed * duration
        )
          break;
        const macro = evaluateMacroTrend(
          macros.map((c) => ({
            timestamp: +c.time,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: Number(c.volume),
          })),
          +bar.time,
          macroDuration,
        );
        if (macro.reason) break;
        observed++;
        if (!macro.macroBullish || signal.entryPrice <= macro.ema200!) {
          order.action = "MAKER_ENTRY_CANCELLED";
          terminal = true;
          break;
        }
        if (!fillMakerBuy(signal, bar, pending.postedAt, duration)) continue;
        const result = await this.openPositionOnce(
          order.symbol,
          order.timeframe,
          pending.experimental,
          signal,
          undefined,
          { order, bar, executionTimeframe },
        );
        order.action = result.position
          ? "MAKER_ENTRY_FILLED"
          : "MAKER_ENTRY_CANCELLED";
        terminal = true;
        break;
      }
      if (!terminal && now >= expiresAt) {
        const expected = Math.max(
          0,
          Math.floor((expiresAt - window.eligibleAt) / duration),
        );
        // An unknown historical fill stays quarantined; valid unfilled orders expire at their TTL.
        if (observed === expected) {
          order.action = "MAKER_ENTRY_EXPIRED";
          terminal = true;
        }
      }
      if (terminal)
        await this.demoPositionRepository.manager.save(AlertDelivery, order);
    }
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

    const open = await this.getOpenPositions(),
      pending = await this.getPendingMakerOrders();
    const reserved = pending.reduce(
      (sum, order) =>
        sum +
        (order.payload?.makerEntry?.investedAmount ?? 0) * (1 + MAKER_FEE_RATE),
      0,
    );
    const committed = open.reduce(
      (sum, p) =>
        sum +
        Number(p.investedAmount) +
        Number(p.entryFee) +
        Number(p.entrySlippage),
      0,
    );
    return {
      openPositions: open.length,
      pendingMakerOrders: pending.length,
      pendingReservedEUR: reserved,
      availableCashEUR:
        startingBalance + realizedPnlQuote - committed - reserved,
      maximumPositions: MAX_SPOT_POSITIONS,
      capacityCounts: "FILLED_OPEN_ONLY",
      pendingEntryTTLHours: 24,
      signalTimeframe: Timeframe.FOUR_HOURS,
      executionTimeframe: Timeframe.ONE_HOUR,
      protectedStopOffsetPercent: MARKET_STOP_BREAK_EVEN_CUSHION * 100,
      executionPolicy: {
        orderType: "limit",
        postOnly: true,
        postOnlyAppliesTo: "ENTRY_AND_TAKE_PROFIT",
        feePerSide: MAKER_FEE_RATE,
        stopOrderType: "market",
        stopFeeRate: STOP_MARKET_FEE_RATE,
        stopSlippageRate: STOP_MARKET_SLIPPAGE_RATE,
        legacyStopPolicy: "STORED_POSITION_POLICY_OR_MAKER_ONLY",
        fillModel: "CONSERVATIVE_CLOSED_1H_PROXY",
      },
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
    return this.serialize(() =>
      this.withEntryLock(async (service) => {
        await service.reconcileMakerEntries();
        return service.checkOpenPositionsOnce();
      }),
    );
  }

  private async checkOpenPositionsOnce() {
    const processed: Array<Record<string, unknown>> = [];
    for (const position of await this.getOpenPositions()) {
      const entry = Number(position.entry),
        stopLoss = Number(position.stopLoss),
        takeProfit = Number(position.takeProfit);
      const base = {
        symbol: position.symbol,
        timeframe: position.timeframe,
        side: position.side,
        mode: position.mode,
        entry,
        stopLoss,
        takeProfit,
      };
      try {
        const quantity = Number(position.quantity),
          invested = Number(position.investedAmount);
        if (
          position.side !== "BUY" ||
          ![entry, stopLoss, takeProfit, quantity, invested].every(
            (v) => Number.isFinite(v) && v > 0,
          ) ||
          ![Number(position.entryFee), Number(position.entrySlippage)].every(
            (v) => Number.isFinite(v) && v >= 0,
          ) ||
          Math.abs(invested - quantity * entry) > 1e-6 * Math.max(1, invested)
        )
          throw new Error("INVALID_STORED_SPOT_COST_BASIS");
        // Reconstruct the accepted stop policy; null preserves legacy Maker exits.
        const executionTimeframe =
          position.executionTimeframe ?? position.timeframe;
        const duration =
          executionTimeframe === Timeframe.FOUR_HOURS
            ? FOUR_HOURS_MS
            : ONE_HOUR_MS;
        const start = new Date(
          Math.ceil(+position.openedAt / duration) * duration,
        );
        const candles = await this.getCompletedCandlesAfterOpen(
          position.symbol,
          start,
          executionTimeframe,
        );
        const replay = findTradeOutcome(
          {
            action: "BUY",
            executionPolicy: "MAKER_ONLY",
            stopExecutionPolicy: position.stopExecutionPolicy ?? "MAKER_ONLY",
            entryPrice: entry,
            stopLoss,
            takeProfit,
          } as TradingSignal,
          candles,
          duration,
        );
        position.maximumFavorableR = replay.durationCandles
          ? replay.mfeR
          : null;
        position.maximumAdverseR = replay.durationCandles ? replay.maeR : null;
        if (replay.exitIndex === null || replay.exitPrice === null) {
          await this.demoPositionRepository.save(position);
          processed.push({
            ...base,
            status: "OPEN",
            effectiveStopLoss: replay.activeStopLoss,
            pendingStopLimit: replay.pendingStopLimit,
            exitPrice: null,
            closedAt: null,
            resultR: null,
            realizedPnlQuote: null,
            maximumFavorableR: position.maximumFavorableR,
            maximumAdverseR: position.maximumAdverseR,
            exitReason: null,
            reason:
              replay.pendingStopLimit !== null
                ? "Stop sell limit is pending; no market fallback is permitted."
                : "Awaiting a valid closed entry-timeframe Maker fill; 1.5R break-even applies only to later bars.",
          });
          continue;
        }
        position.exitPrice = replay.exitPrice;
        position.closedAt = new Date(
          +candles[replay.exitIndex].time + duration,
        );
        position.exitReason = replay.exitReason;
        const exitValue = Number(position.quantity) * replay.exitPrice;
        const marketStop =
          position.stopExecutionPolicy === "MARKET_STOP" &&
          replay.exitReason !== "TAKE_PROFIT";
        position.exitFee =
          exitValue * (marketStop ? STOP_MARKET_FEE_RATE : MAKER_FEE_RATE);
        // exitPrice includes slippage; record it without subtracting twice.
        position.exitSlippage =
          Number(position.quantity) * replay.exitSlippagePerUnit;
        position.realizedPnlQuote =
          exitValue -
          Number(position.investedAmount) -
          Number(position.entryFee) -
          Number(position.entrySlippage) -
          Number(position.exitFee);
        position.status = position.realizedPnlQuote < 0 ? "LOSS" : "WIN";
        const net = getDemoPositionResult(position);
        position.resultR = net.resultR;
        await savePositionWithNotification(
          this.demoPositionRepository,
          position,
          "CLOSE",
        );
        processed.push({
          ...base,
          status: position.status,
          exitPrice: position.exitPrice,
          closedAt: position.closedAt,
          resultR: position.resultR,
          netResult: net.netResult,
          realizedPnlQuote: position.realizedPnlQuote,
          maximumFavorableR: position.maximumFavorableR,
          maximumAdverseR: position.maximumAdverseR,
          exitReason: position.exitReason,
          exitCandleTimeframe: executionTimeframe,
          reason:
            "Resting Maker sell limit filled by the closed-bar trade-through proxy.",
        });
      } catch {
        processed.push({
          ...base,
          status: "OPEN",
          exitPrice: null,
          closedAt: null,
          resultR: null,
          realizedPnlQuote: null,
          exitReason: null,
          reason:
            "Invalid stored Spot cost basis or unavailable contiguous execution data; no exit fill was fabricated.",
        });
      }
    }
    return { checkedAt: new Date(), processed };
  }

  private async getCompletedCandlesAfterOpen(
    symbol: string,
    openedAt: Date,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    const durationMs =
      timeframe === Timeframe.FOUR_HOURS ? FOUR_HOURS_MS : ONE_HOUR_MS;
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

  private async calculatePositionSize(
    entry: number,
    stopLoss: number,
    marketStop = false,
  ) {
    const history = await this.getHistory();
    const realizedPnl = history.reduce(
      (sum, position) => sum + Number(position.realizedPnlQuote ?? 0),
      0,
    );
    const openPositions = await this.getOpenPositions();
    const pendingReserved = (await this.getPendingMakerOrders()).reduce(
      (sum, order) =>
        sum +
        (order.payload?.makerEntry?.investedAmount ?? 0) * (1 + MAKER_FEE_RATE),
      0,
    );
    const committedCapital =
      pendingReserved +
      openPositions.reduce(
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
      MAKER_FEE_RATE,
      marketStop ? STOP_MARKET_SLIPPAGE_RATE : 0,
    );
  }
}
