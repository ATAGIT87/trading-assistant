export type SignalAction = 'BUY' | 'SELL' | 'WAIT';
export interface TradingSignal {
    action: SignalAction;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    rsi: number;
    rsiStatus: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    marketCondition: 'POSSIBLE_REVERSAL' | 'BEARISH_CONTINUATION' | 'BULLISH_CONTINUATION' | 'NEUTRAL';
    reason: string;
}
