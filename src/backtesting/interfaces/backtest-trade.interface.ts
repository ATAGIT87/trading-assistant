import { TradingSignal } from "../../signals/signal.types";

export interface BacktestTrade {
  symbol: string;
  segment: "training" | "validation" | "test" | "protectedHoldout";
  riskAmount: number;
  /** Per-trade values, retained so capacity-constrained portfolio reports do not count rejected trades. */
  grossR: number | null;
  feeR: number;
  slippageR: number;
  resultR: number | null;
  maeR: number;
  mfeR: number;
  durationCandles: number;
  time: Date;
  action: "BUY" | "SELL";
  confidence: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  trend: TradingSignal["trend"];
  rsi: number;
  adx: number;
  marketCondition: TradingSignal["marketCondition"];
  result: "WIN" | "LOSS" | "OPEN";
  exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
  exitTime: Date | null;
  exitPrice: number | null;
}
