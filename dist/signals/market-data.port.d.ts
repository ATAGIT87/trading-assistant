import type { Timeframe } from "../assets/enums/timeframe.enum";
export interface MarketDataPort {
    getTrend(symbol: string, timeframe: Timeframe, period: number): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null>;
    compareLatestPriceToSma(symbol: string, timeframe: Timeframe, period: number): Promise<"ABOVE" | "BELOW" | "EQUAL" | null>;
    compareLatestPriceToEma(symbol: string, timeframe: Timeframe, period: number): Promise<"ABOVE" | "BELOW" | "EQUAL" | null>;
    getLatestRsi(symbol: string, timeframe: Timeframe): Promise<number | null>;
    getRsiStatus(symbol: string, timeframe: Timeframe, period: number): Promise<"OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | null>;
    getMarketCondition(symbol: string, timeframe: Timeframe, period: number): Promise<"POSSIBLE_REVERSAL" | "BEARISH_CONTINUATION" | "BULLISH_CONTINUATION" | "NEUTRAL" | null>;
    getLatestPrice(symbol: string, timeframe: Timeframe): Promise<number | null>;
    getLatestAtr(symbol: string, timeframe: Timeframe, period: number): Promise<number | null>;
}
