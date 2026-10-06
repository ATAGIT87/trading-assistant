export type SignalAction = "BUY" | "SELL" | "WAIT" | "NO_TRADE";

export interface TradingSignal {
  strategyVersion?: string;
  analysis?: {
    modelVersion: string;
    strategyVersion: string;
    decisionAt: Date;
    hourlyDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
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
  /** Recheck setup economics after filling at a different next-open price. */
  minimumRewardRisk?: number;
  minimumNetRewardRisk?: number;
  preserveTakeProfit?: boolean;
  profitProtection?: boolean;
  /** Maximum structural stop distance as a fraction of the actual fill. */
  maximumStopDistanceFraction?: number;
  isStrongSetup: boolean;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  rsi: number;
  adx: number;
  rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
  marketCondition:
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL";
  candleTime: Date;
  reason: string;
}
