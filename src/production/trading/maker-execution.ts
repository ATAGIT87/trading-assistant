import { TradingSignal } from "../signals/signal.types";
import { FOUR_HOURS_MS } from "./ccxt/analyze-market";
import { rebaseSignalAtEntry, ExecutableSignal } from "./trade-execution";

/** Conservative fixed Maker cost. Lower tiers require an explicit future change. */
export const MAKER_FEE_RATE = 0.004;
export const MAX_SPOT_POSITIONS = 6;
export const PENDING_ENTRY_TTL_MS = 6 * FOUR_HOURS_MS;
export const BREAK_EVEN_CUSHION = 0.0085;
/** Explicit Demo assumptions, not a guarantee of exchange execution costs. */
export const STOP_MARKET_FEE_RATE = 0.004;
export const STOP_MARKET_SLIPPAGE_RATE = 0.001;
export const MARKET_STOP_BREAK_EVEN_CUSHION =
  (1 + MAKER_FEE_RATE) /
    ((1 - STOP_MARKET_FEE_RATE) * (1 - STOP_MARKET_SLIPPAGE_RATE)) -
  1 +
  0.0001;

export interface MakerBar {
  time: Date;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
}
export interface MakerPositionState {
  activeStop: number;
  stopTriggered: boolean;
  stopLimit: number | null;
  eligibleAt: number;
}

/** Crossed post-only submissions must be rejected, never converted to market. */
export function isPassiveLimit(
  side: "BUY" | "SELL",
  price: number,
  bid: number,
  ask: number,
): boolean {
  return (
    [price, bid, ask].every((v) => Number.isFinite(v) && v > 0) &&
    bid < ask &&
    (side === "BUY" ? price < ask : price > bid)
  );
}

/** Candle simulation excludes a partially observed placement bar. Exact 24h TTL (six execution bars), independent of the entry timeframe. */
export function makerEntryWindow(postedAt: number, durationMs = FOUR_HOURS_MS) {
  if (!Number.isSafeInteger(postedAt) || postedAt <= 0)
    throw new Error("INVALID_MAKER_ORDER_TIME");
  const eligibleAt = Math.ceil(postedAt / durationMs) * durationMs;
  return { eligibleAt, expiresAt: postedAt + PENDING_ENTRY_TTL_MS };
}

export function validMakerBar(
  bar: MakerBar,
  durationMs = FOUR_HOURS_MS,
): boolean {
  const [open, high, low, close] = [bar.open, bar.high, bar.low, bar.close].map(
    Number,
  );
  return (
    Number.isSafeInteger(+bar.time) &&
    +bar.time > 0 &&
    +bar.time % durationMs === 0 &&
    [open, high, low, close].every((v) => Number.isFinite(v) && v > 0) &&
    high >= Math.max(open, close) &&
    low <= Math.min(open, close) &&
    high >= low &&
    Number.isFinite(Number(bar.volume)) &&
    Number(bar.volume) >= 0
  );
}

/** Strict trade-through is an OHLC fill proxy, not proof of order-book queue priority. */
export function fillMakerBuy(
  signal: TradingSignal,
  bar: MakerBar,
  postedAt: number,
  durationMs = FOUR_HOURS_MS,
): ExecutableSignal | null {
  const window = makerEntryWindow(postedAt, durationMs);
  if (
    signal.executionPolicy !== "MAKER_ONLY" ||
    signal.action !== "BUY" ||
    !validMakerBar(bar, durationMs) ||
    +bar.time < window.eligibleAt ||
    +bar.time + durationMs > window.expiresAt ||
    Number(bar.open) <= signal.entryPrice ||
    Number(bar.low) >= signal.entryPrice ||
    Number(bar.volume) <= 0
  )
    return null;
  return rebaseSignalAtEntry(signal, signal.entryPrice);
}

export function initialMakerPosition(
  signal: Pick<TradingSignal, "entryPrice" | "stopLoss">,
  openedAt: number,
): MakerPositionState {
  if (
    signal.stopLoss === null ||
    !Number.isFinite(signal.entryPrice) ||
    !Number.isFinite(signal.stopLoss) ||
    signal.stopLoss <= 0 ||
    signal.stopLoss >= signal.entryPrice
  )
    throw new Error("INVALID_MAKER_RISK");
  return {
    activeStop: signal.stopLoss,
    stopTriggered: false,
    stopLimit: null,
    eligibleAt: openedAt,
  };
}

/**
 * TP remains a resting sell limit. MARKET_STOP crosses at the adverse open/SL
 * with modeled slippage; legacy stops arm a later passive sell. Protection
 * activates after a completed 1.5R bar, for later bars only, with policy-specific costs.
 */
export function advanceMakerPosition(
  signal: Pick<
    TradingSignal,
    "entryPrice" | "stopLoss" | "takeProfit" | "stopExecutionPolicy"
  >,
  previous: MakerPositionState,
  bar: MakerBar,
  durationMs = FOUR_HOURS_MS,
): {
  state: MakerPositionState;
  exitPrice: number | null;
  exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "PROFIT_PROTECTION" | null;
  exitSlippagePerUnit?: number;
} {
  const marketStop = signal.stopExecutionPolicy === "MARKET_STOP";
  const cushion = marketStop
    ? MARKET_STOP_BREAK_EVEN_CUSHION
    : BREAK_EVEN_CUSHION;
  if (
    !validMakerBar(bar, durationMs) ||
    (signal.stopExecutionPolicy !== undefined &&
      !["MARKET_STOP", "MAKER_ONLY"].includes(signal.stopExecutionPolicy)) ||
    signal.stopLoss === null ||
    signal.takeProfit === null ||
    ![
      signal.entryPrice,
      signal.stopLoss,
      signal.takeProfit,
      previous.activeStop,
    ].every((v) => Number.isFinite(v) && v > 0) ||
    signal.stopLoss >= signal.entryPrice ||
    previous.activeStop < signal.stopLoss ||
    previous.activeStop > signal.entryPrice * (1 + cushion) ||
    signal.takeProfit <= signal.entryPrice
  )
    throw new Error("INVALID_MAKER_BAR_OR_LEVELS");
  const state = { ...previous };
  const none = { state, exitPrice: null, exitReason: null };
  if (+bar.time < state.eligibleAt || Number(bar.volume) <= 0) return none;
  const open = Number(bar.open),
    high = Number(bar.high),
    low = Number(bar.low),
    close = Number(bar.close);
  if (state.stopTriggered) {
    if (
      state.stopLimit !== null &&
      open < state.stopLimit &&
      high > state.stopLimit
    )
      return {
        state,
        exitPrice: state.stopLimit,
        exitReason:
          state.activeStop > signal.stopLoss
            ? "PROFIT_PROTECTION"
            : "STOP_LOSS",
      };
    return none;
  }
  if (low <= state.activeStop) {
    if (marketStop) {
      // An opening gap is filled at the adverse open, not at an unavailable SL.
      // When TP and SL both cross, use stop-first; OHLC cannot establish sequence.
      const reference = Math.min(open, state.activeStop);
      const exitSlippagePerUnit = reference * STOP_MARKET_SLIPPAGE_RATE;
      return {
        state,
        exitPrice: reference - exitSlippagePerUnit,
        exitSlippagePerUnit,
        exitReason:
          state.activeStop > signal.stopLoss
            ? "PROFIT_PROTECTION"
            : "STOP_LOSS",
      };
    }
    state.stopTriggered = true;
    // Raising above a recovered close avoids modelling an immediately marketable sell.
    state.stopLimit = Math.max(state.activeStop, close * (1 + 1e-6));
    state.eligibleAt = +bar.time + durationMs;
    return none;
  }
  if (open < signal.takeProfit && high > signal.takeProfit)
    return { state, exitPrice: signal.takeProfit, exitReason: "TAKE_PROFIT" };
  const initialRisk = signal.entryPrice - signal.stopLoss;
  if (high >= signal.entryPrice + 1.5 * initialRisk)
    state.activeStop = Math.max(
      state.activeStop,
      signal.entryPrice * (1 + cushion),
    );
  return none;
}
