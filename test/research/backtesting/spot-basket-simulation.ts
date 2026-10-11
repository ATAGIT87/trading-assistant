import { EVIDENCE_ENGINE_VERSION } from "../../../src/production/strategy-approval/evidence-engine";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";

import {
  FOUR_HOURS_MS,
  ONE_HOUR_MS,
  SPOT_STRATEGY_VERSION,
} from "../../../src/production/trading/ccxt/analyze-market";
import {
  advanceMakerPosition,
  fillMakerBuy,
  initialMakerPosition,
  MakerPositionState,
  makerEntryWindow,
  MAKER_FEE_RATE,
  STOP_MARKET_FEE_RATE,
  STOP_MARKET_SLIPPAGE_RATE,
  MAX_SPOT_POSITIONS,
  validMakerBar,
} from "../../../src/production/trading/maker-execution";
import {
  hasPositiveNetTarget,
  ExecutableSignal,
} from "../../../src/production/trading/trade-execution";
import {
  calculateSpotPositionSize,
  SpotPositionSize,
} from "../../../src/production/trading/spot-position-sizing";
import { TradingSignal } from "../../../src/production/signals/signal.types";
import { EmaRsiReplayStrategy } from "../strategies/ema-rsi-replay.strategy";

interface Pending {
  signal: TradingSignal;
  postedAt: number;
  size: SpotPositionSize;
  reserved: number;
  expectedAt: number;
  frozen: boolean;
}
interface Position {
  signal: ExecutableSignal;
  state: MakerPositionState;
  size: SpotPositionSize;
  openedAt: number;
  expectedAt: number;
  frozen: boolean;
}
export interface BasketSimulationOptions {
  /** Independent hourly source; omission explicitly selects legacy 4h replay. */
  executionDatasets?: Record<string, MarketCandle[]>;
  startingBalanceEUR: number;
  riskPerTrade: number;
  maximumInvestedEUR: number;
  continuousCommonWindow?: boolean;
  watchlistAt?: (decisionAt: number) => string[];
  verifiedNoTradeCoverage?: Record<string, { from: number; through: number }>;
}

/** One shared EUR wallet; pending limits reserve funds; only fills occupy capacity. No DB side effects. */
export function simulateSpotBasket(
  datasets: Record<string, MarketCandle[]>,
  strategy: Pick<EmaRsiReplayStrategy, "evaluateCandles"> & {
    minimumHistory?: number;
  },
  options: BasketSimulationOptions,
) {
  if (
    ![
      options.startingBalanceEUR,
      options.riskPerTrade,
      options.maximumInvestedEUR,
    ].every((v) => Number.isFinite(v) && v > 0) ||
    options.riskPerTrade > 0.01 ||
    options.maximumInvestedEUR > 100
  )
    throw new Error("INVALID_SPOT_BASKET_BUDGET");
  const symbols = Object.keys(datasets).sort();
  if (!symbols.length) throw new Error("EMPTY_EUR_UNIVERSE");
  const duration = options.executionDatasets ? ONE_HOUR_MS : FOUR_HOURS_MS;
  const minimumHistory = strategy.minimumHistory ?? 50;
  const books = new Map<string, Map<number, MarketCandle>>();
  for (const symbol of symbols) {
    if (!datasets[symbol]?.length)
      throw new Error(`Missing 4h source data for ${symbol}.`);
    const book = new Map<number, MarketCandle>();
    for (const bar of datasets[symbol]) {
      if (!validMakerBar(bar) || bar.symbol !== symbol || book.has(+bar.time))
        throw new Error(`Invalid/duplicate 4h source candle for ${symbol}.`);
      book.set(+bar.time, bar);
    }
    books.set(symbol, book);
  }
  const executionBooks = options.executionDatasets
    ? new Map<string, Map<number, MarketCandle>>()
    : books;
  if (options.executionDatasets) {
    if (Object.keys(options.executionDatasets).some((s) => !books.has(s)))
      throw new Error("EXECUTION_UNIVERSE_MISMATCH");
    for (const symbol of symbols) {
      const rows = options.executionDatasets[symbol];
      if (!rows?.length)
        throw new Error(`Missing 1h execution source data for ${symbol}.`);
      const book = new Map<number, MarketCandle>();
      for (const bar of rows) {
        if (
          !validMakerBar(bar, duration) ||
          bar.symbol !== symbol ||
          book.has(+bar.time)
        )
          throw new Error(
            `Invalid/duplicate 1h execution source candle for ${symbol}.`,
          );
        book.set(+bar.time, bar);
      }
      executionBooks.set(symbol, book);
    }
  }
  let times = [
    ...new Set([...executionBooks.values()].flatMap((b) => [...b.keys()])),
  ].sort((a, b) => a - b);
  if (options.verifiedNoTradeCoverage && times.length) {
    const first = times[0],
      last = times.at(-1)!;
    times = Array.from(
      { length: (last - first) / duration + 1 },
      (_, i) => first + i * duration,
    );
  }
  const inputCoverage = symbols.map((symbol) => ({
    symbol,
    bars: books.get(symbol)!.size,
    executionBars: executionBooks.get(symbol)!.size,
  }));
  if (options.continuousCommonWindow !== false) {
    const common = times.filter((t) =>
      symbols.every((symbol) => executionBooks.get(symbol)!.has(t)),
    );
    let longest: number[] = [],
      run: number[] = [];
    for (const t of common) {
      if (run.length && t - run.at(-1)! !== duration) {
        if (run.length > longest.length) longest = run;
        run = [];
      }
      run.push(t);
    }
    if (run.length > longest.length) longest = run;
    if (longest.length < minimumHistory * (FOUR_HOURS_MS / duration) + 3)
      throw new Error(
        "Insufficient common continuous 4h data for EMA50 warmup and Maker entry observation.",
      );
    times = longest;
  }
  const histories = new Map<string, MarketCandle[]>(),
    pending = new Map<string, Pending>(),
    positions = new Map<string, Position>(),
    marks = new Map<string, number>();
  const watchlistHistory: Array<{ decisionAt: Date; symbols: string[] }> = [];
  if (options.executionDatasets) {
    // Live analysis already has history before the first execution observation.
    for (const symbol of symbols)
      histories.set(
        symbol,
        datasets[symbol]
          .filter((b) => +b.time + FOUR_HOURS_MS <= times[0])
          .slice(-719),
      );
  }
  let previousWatchlist = "";
  const trades: Array<{
    symbol: string;
    openedAt: Date;
    closedAt: Date;
    entry: number;
    exit: number;
    stopLoss: number;
    quantity: number;
    feeEUR: number;
    pnlEUR: number;
    netR: number;
    exitReason: string;
  }> = [];
  const monthly: Array<{
    month: string;
    partial: boolean;
    returnPct: number;
    entries: number;
    closed: number;
    wins: number;
    losses: number;
    netPnlEUR: number;
    meetsTenProfitableBuys: boolean;
  }> = [];
  const counters = {
    signals: 0,
    submitted: 0,
    filled: 0,
    expired: 0,
    costRejected: 0,
    capacityRejected: 0,
    dataGaps: 0,
    verifiedEmptyIntervals: 0,
    capacityCancelled: 0,
    macroCancelled: 0,
  };
  let cash = options.startingBalanceEUR,
    peak = cash,
    maxDrawdown = 0,
    previousEquity = cash,
    monthStartEquity = cash,
    monthKey = "",
    monthEntries = 0,
    monthClosed = 0,
    monthWins = 0,
    monthLosses = 0,
    monthPnl = 0,
    maxCommitted = 0,
    maxOpen = 0,
    maxPending = 0;
  const equity = () =>
    cash +
    [...pending.values()].reduce((s, p) => s + p.reserved, 0) +
    [...positions.entries()].reduce(
      (s, [symbol, p]) =>
        s + p.size.quantity * (marks.get(symbol) ?? p.signal.entryPrice),
      0,
    );
  const finishMonth = (partial: boolean) => {
    if (monthKey)
      monthly.push({
        month: monthKey,
        partial,
        returnPct: 100 * (previousEquity / monthStartEquity - 1),
        entries: monthEntries,
        closed: monthClosed,
        wins: monthWins,
        losses: monthLosses,
        netPnlEUR: monthPnl,
        meetsTenProfitableBuys: monthWins >= 10,
      });
  };
  const knownEmpty = (symbol: string, t: number) => {
    const coverage = options.verifiedNoTradeCoverage?.[symbol];
    return !!coverage && t >= coverage.from && t + duration <= coverage.through;
  };
  for (const t of times) {
    let fillSlots = MAX_SPOT_POSITIONS - positions.size;
    const key = new Date(t).toISOString().slice(0, 7);
    if (key !== monthKey) {
      finishMonth(
        monthKey === new Date(times[0]).toISOString().slice(0, 7) &&
          (new Date(times[0]).getUTCDate() !== 1 ||
            new Date(times[0]).getUTCHours() !== 0),
      );
      monthKey = key;
      monthStartEquity = previousEquity;
      monthEntries = 0;
      monthClosed = 0;
      monthWins = 0;
      monthLosses = 0;
      monthPnl = 0;
    }
    // Existing positions observe this completed bar. Newly filled entries begin at its close.
    for (const symbol of symbols) {
      const bar = executionBooks.get(symbol)!.get(t),
        p = positions.get(symbol);
      if (p && !bar && knownEmpty(symbol, t)) {
        p.expectedAt = t + duration;
        counters.verifiedEmptyIntervals++;
        continue; // No trade, fill, stop observation or manufactured candle.
      }
      if (p && p.expectedAt !== t && !p.frozen) {
        p.frozen = true;
        counters.dataGaps++;
      }
      if (p && !bar && !p.frozen) {
        p.frozen = true;
        counters.dataGaps++;
      }
      if (!bar) continue;
      marks.set(symbol, Number(bar.close));
      if (!p || p.frozen) continue;
      const step = advanceMakerPosition(p.signal, p.state, bar, duration);
      p.state = step.state;
      p.expectedAt = t + duration;
      if (step.exitPrice !== null) {
        const exitValue = p.size.quantity * step.exitPrice;
        const exitFeeRate =
          p.signal.stopExecutionPolicy === "MARKET_STOP" &&
          step.exitReason !== "TAKE_PROFIT"
            ? STOP_MARKET_FEE_RATE
            : MAKER_FEE_RATE;
        const feeEUR =
          p.size.investedAmount * MAKER_FEE_RATE + exitValue * exitFeeRate;
        const pnlEUR = exitValue - p.size.investedAmount - feeEUR;
        cash += exitValue * (1 - exitFeeRate);
        trades.push({
          symbol,
          openedAt: new Date(p.openedAt),
          closedAt: new Date(t + duration),
          entry: p.signal.entryPrice,
          exit: step.exitPrice,
          stopLoss: p.signal.stopLoss,
          quantity: p.size.quantity,
          feeEUR,
          pnlEUR,
          netR:
            pnlEUR /
            (p.size.quantity * (p.signal.entryPrice - p.signal.stopLoss)),
          exitReason: step.exitReason!,
        });
        monthClosed++;
        if (pnlEUR > 0) monthWins++;
        if (pnlEUR < 0) monthLosses++;
        monthPnl += pnlEUR;
        positions.delete(symbol);
      }
    }
    for (const [symbol, order] of pending) {
      const window = makerEntryWindow(order.postedAt, duration),
        bar = executionBooks.get(symbol)!.get(t);
      if (t < window.eligibleAt || order.frozen) continue;
      if (t !== order.expectedAt) {
        order.frozen = true;
        counters.dataGaps++;
        continue;
      }
      if (fillSlots <= 0) {
        cash += order.reserved;
        pending.delete(symbol);
        counters.capacityCancelled++;
        continue;
      }
      if (!bar) {
        if (knownEmpty(symbol, t)) {
          order.expectedAt = t + duration;
          counters.verifiedEmptyIntervals++;
          if (t + duration + 10000 >= window.expiresAt) {
            cash += order.reserved;
            pending.delete(symbol);
            counters.expired++;
          }
        } else {
          order.frozen = true;
          counters.dataGaps++;
        }
        continue;
      }
      order.expectedAt = t + duration;
      const priorHistory = histories.get(symbol) ?? [];
      const snapshot = strategy.evaluateCandles(priorHistory);
      const macroReady = snapshot.analysis?.indicators.ema200 !== undefined;
      if (!macroReady) {
        counters.dataGaps++;
        continue;
      }
      if (
        !snapshot.analysis?.evidence.macroTrendBullish ||
        order.signal.entryPrice <= snapshot.analysis.indicators.ema200
      ) {
        cash += order.reserved;
        pending.delete(symbol);
        counters.macroCancelled++;
        continue;
      }
      const fill = fillMakerBuy(order.signal, bar, order.postedAt, duration);
      if (fill) {
        const openedAt = t + duration;
        positions.set(symbol, {
          signal: fill,
          state: initialMakerPosition(fill, openedAt),
          size: order.size,
          openedAt,
          expectedAt: openedAt,
          frozen: false,
        });
        counters.filled++;
        monthEntries++;
        fillSlots--;
        pending.delete(symbol);
        maxOpen = Math.max(maxOpen, positions.size);
      } else if (t + duration + 10000 >= window.expiresAt) {
        cash += order.reserved;
        counters.expired++;
        pending.delete(symbol);
      }
    }
    const decisionAt = t + duration;
    if (decisionAt % FOUR_HOURS_MS === 0) {
      // Signal selection at the CLOSE: no future candle or filled capital is used retroactively.
      // Rotate equal-time market priority deterministically, independent of outcomes.
      const activeSymbols = options.watchlistAt
        ? options.watchlistAt(decisionAt)
        : symbols;
      if (
        new Set(activeSymbols).size !== activeSymbols.length ||
        activeSymbols.some((symbol) => !books.has(symbol))
      )
        throw new Error("INVALID_HISTORICAL_WATCHLIST");
      const watchlistKey = activeSymbols.join(",");
      if (watchlistKey !== previousWatchlist) {
        watchlistHistory.push({
          decisionAt: new Date(decisionAt),
          symbols: [...activeSymbols],
        });
        previousWatchlist = watchlistKey;
      }
      const offset = activeSymbols.length
        ? Math.floor((decisionAt - FOUR_HOURS_MS) / FOUR_HOURS_MS) %
          activeSymbols.length
        : 0;
      const priority = [
        ...activeSymbols.slice(offset),
        ...activeSymbols.slice(0, offset),
        ...symbols.filter((s) => !activeSymbols.includes(s)),
      ];
      for (const symbol of priority) {
        const signalTime = decisionAt - FOUR_HOURS_MS;
        const bar = books.get(symbol)!.get(signalTime);
        if (!bar) continue;
        let history = histories.get(symbol) ?? [];
        if (
          history.length &&
          +history.at(-1)!.time + FOUR_HOURS_MS !== signalTime
        )
          history = [];
        history.push(bar);
        history = history.slice(-719);
        histories.set(symbol, history);
        if (
          !activeSymbols.includes(symbol) ||
          history.length < minimumHistory ||
          pending.has(symbol) ||
          positions.has(symbol)
        )
          continue;
        const signal = strategy.evaluateCandles(history);
        if (signal.action !== "BUY") continue;
        counters.signals++;
        if (
          signal.executionPolicy !== "MAKER_ONLY" ||
          signal.stopLoss === null ||
          signal.takeProfit === null
        )
          throw new Error("NON_MAKER_SIGNAL_FORBIDDEN");
        if (
          !hasPositiveNetTarget(signal as ExecutableSignal, MAKER_FEE_RATE, 0)
        ) {
          counters.costRejected++;
          continue;
        }
        if (positions.size >= MAX_SPOT_POSITIONS) {
          counters.capacityRejected++;
          continue;
        }
        const size = calculateSpotPositionSize(
          signal.entryPrice,
          signal.stopLoss,
          cash,
          options.riskPerTrade,
          options.maximumInvestedEUR,
          MAKER_FEE_RATE,
          signal.stopExecutionPolicy === "MARKET_STOP"
            ? STOP_MARKET_SLIPPAGE_RATE
            : 0,
        );
        if (!size) continue;
        const reserved = size.investedAmount * (1 + MAKER_FEE_RATE);
        cash -= reserved;
        pending.set(symbol, {
          signal,
          postedAt: decisionAt + 10_000,
          size,
          reserved,
          expectedAt: makerEntryWindow(decisionAt + 10_000, duration)
            .eligibleAt,
          frozen: false,
        });
        counters.submitted++;
        maxCommitted = Math.max(maxCommitted, pending.size + positions.size);
        maxPending = Math.max(maxPending, pending.size);
        if (cash < -1e-7) throw new Error("NEGATIVE_SPOT_CASH");
      }
    }
    previousEquity = equity();
    peak = Math.max(peak, previousEquity);
    maxDrawdown = Math.max(maxDrawdown, 1 - previousEquity / peak);
  }
  const end = times.at(-1)! + duration;
  finishMonth(
    new Date(end).getUTCDate() !== 1 || new Date(end).getUTCHours() !== 0,
  );
  const fullMonths = monthly.filter((m) => !m.partial),
    wins = trades.filter((t) => t.pnlEUR > 0).length;
  return {
    strategyVersion: SPOT_STRATEGY_VERSION,
    engineVersion:
      duration === ONE_HOUR_MS
        ? EVIDENCE_ENGINE_VERSION
        : "spot-4h-signal-4h-execution-compatibility",
    timeframe: "4h",
    macroTimeframe: "1d",
    executionTimeframe: duration === ONE_HOUR_MS ? "1h" : "4h",
    symbols: [...symbols],
    execution: {
      orderType: "limit",
      postOnly: true,
      feePerSide: MAKER_FEE_RATE,
      entrySlippageRate: 0,
      stopExecutionPolicy: "SIGNAL_SNAPSHOT",
      stopMarketFeeRate: STOP_MARKET_FEE_RATE,
      stopMarketSlippageRate: STOP_MARKET_SLIPPAGE_RATE,
      fillModel: "CONSERVATIVE_OHLC_TRADE_THROUGH",
      makerFillsValidated: false,
      entryTTLHours: 24,
      ttlExecutionCandles: 86_400_000 / duration,
      equalTimePriority: "DETERMINISTIC_4H_ROTATION",
      entryLimitReference: "SIGNAL_CLOSE",
    },
    start: new Date(times[0]),
    end: new Date(end),
    options: {
      ...options,
      watchlistAt: undefined,
      executionDatasets: undefined,
    },
    watchlist: {
      dynamic: !!options.watchlistAt,
      size: options.watchlistAt ? 30 : symbols.length,
      refresh: "COMPLETED_UTC_DAILY_TURNOVER",
      history: watchlistHistory,
    },
    coverage: {
      mode:
        options.continuousCommonWindow === false
          ? "ALL_DATA_WITH_GAPS_FROZEN"
          : "LONGEST_COMMON_CONTINUOUS_WINDOW",
      inputCoverage,
      selectedFourHourBars: times.filter(
        (t) => (t + duration) % FOUR_HOURS_MS === 0,
      ).length,
      selectedExecutionBars: times.length,
    },
    counters,
    maximumConcurrentCommitted: maxCommitted,
    maximumConcurrentOpen: maxOpen,
    maximumPendingOrders: maxPending,
    summary: {
      dataCoverageUsable: counters.dataGaps === 0,
      filledBuys: counters.filled,
      closed: trades.length,
      wins,
      losses: trades.filter((t) => t.pnlEUR < 0).length,
      winRate: trades.length ? wins / trades.length : null,
      netR: trades.reduce((s, t) => s + t.netR, 0),
      realizedPnlEUR: trades.reduce((s, t) => s + t.pnlEUR, 0),
      cashEUR: cash,
      markedEquityEUR: previousEquity,
      returnPct: 100 * (previousEquity / options.startingBalanceEUR - 1),
      maxCloseDrawdownPct: maxDrawdown * 100,
      completeMonths: fullMonths.length,
      positiveMonths: fullMonths.filter((m) => m.returnPct > 0).length,
      monthsWithTenProfitableBuys: fullMonths.filter(
        (m) => m.meetsTenProfitableBuys,
      ).length,
      averageBuysPerFullMonth: fullMonths.length
        ? fullMonths.reduce((s, m) => s + m.entries, 0) / fullMonths.length
        : null,
    },
    target: {
      profitableBuysPerMonth: 10,
      achievedEveryCompleteMonth:
        counters.dataGaps === 0 &&
        fullMonths.length > 0 &&
        fullMonths.every((m) => m.meetsTenProfitableBuys),
    },
    monthly,
    trades,
    openPositions: [...positions.entries()].map(([symbol, p]) => ({
      symbol,
      openedAt: new Date(p.openedAt),
      initialStop: p.signal.stopLoss,
      activeStop: p.state.activeStop,
      pendingStopLimit: p.state.stopLimit,
      stopTriggered: p.state.stopTriggered,
      unresolvedDataGap: p.frozen,
    })),
    pendingOrders: [...pending.entries()].map(([symbol, p]) => ({
      symbol,
      postedAt: new Date(p.postedAt),
      limit: p.signal.entryPrice,
      expiresAt: new Date(makerEntryWindow(p.postedAt).expiresAt),
      reservedEUR: p.reserved,
      unresolvedDataGap: p.frozen,
    })),
    limitations:
      "Verified complete official archive no-trade intervals cannot fill orders; unknown gaps freeze exposure. OHLC cannot prove post-only queue fills, spread, partial fills or intrabar order sequence. Stop-limit exits may remain unfilled, and the +0.85% fee cushion cannot guarantee a filled exit. Data gaps freeze unresolved positions/reservations; affected performance cannot approve production. Monthly trade/profit targets are measured, not guaranteed. Marked equity includes open assets without future exit fees.",
  };
}
