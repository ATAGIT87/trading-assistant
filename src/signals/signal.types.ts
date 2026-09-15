export type SignalAction = "BUY" | "SELL" | "WAIT" | "NO_TRADE";

export interface TradingSignal {
  action: SignalAction;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  isStrongSetup: boolean;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  rsi: number;
  rsiStatus: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
  marketCondition:
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL";
  reason: string;
}
