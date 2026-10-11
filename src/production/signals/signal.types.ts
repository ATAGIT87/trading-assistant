export type SignalAction = "BUY" | "SELL" | "WAIT" | "NO_TRADE";
export type StopExecutionPolicy = "MAKER_ONLY" | "MARKET_STOP";

export interface TradingSignal {
  strategyVersion?: string;
  analysis?: {
    modelVersion: string;
    strategyVersion: string;
    decisionAt: Date;
    entryDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
    higherDirection: "BULLISH" | "BEARISH" | "NEUTRAL" | null;
    phase: string;
    strength: string;
    structure: string;
    indicators: Record<string, number>;
    evidence: Record<string, boolean>;
    entryAccepted: boolean;
  };
  action: SignalAction;
  confidence: number;
  /** Legacy numeric 0 is a sentinel when no probability/quality score is fitted. */
  confidenceBasis?: "NOT_ESTIMATED";
  entryPrice: number;
  /** Latest forming close, display-only. */
  currentPrice?: number;
  stopLoss: number | null;
  takeProfit: number | null;
  /** Immutable structural ceiling (BUY) / floor (SELL), known at signal close. */
  takeProfitLimit?: number;
  /** Recheck setup economics after filling at a different passive-limit price. */
  minimumRewardRisk?: number;
  minimumNetRewardRisk?: number;
  preserveTakeProfit?: boolean;
  /** Entry/TP policy; stop execution is defined separately. */
  executionPolicy?: "MAKER_ONLY";
  stopExecutionPolicy?: StopExecutionPolicy;
  /** Maximum structural stop distance as a fraction of the actual fill. */
  maximumStopDistanceFraction?: number;
  isStrongSetup: boolean;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  marketCondition:
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL";
  candleTime: Date;
  reason: string;
}
