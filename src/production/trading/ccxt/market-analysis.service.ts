import { Injectable } from "@nestjs/common";
import { normalizeTradingSymbol } from "../../market-data/trading-symbol";
import { analyzeMarket, MarketAnalysis } from "./analyze-market";

export function toCcxtSymbol(symbol: string): string {
  const normalized = normalizeTradingSymbol(symbol.replace("/", ""));
  return `${normalized.slice(0, -3)}/EUR`;
}

/** One coalesced live snapshot for API and execution; bounded allowlisted keys. */
@Injectable()
export class MarketAnalysisService {
  private readonly cache = new Map<
    string,
    { bucket: number; expiresAt: number; result: MarketAnalysis }
  >();
  private readonly inFlight = new Map<string, Promise<MarketAnalysis>>();

  async analyze(symbol: string, timeframe: string): Promise<MarketAnalysis> {
    const unified = toCcxtSymbol(symbol);
    if (timeframe !== "4h")
      return {
        symbol: unified,
        timeframe,
        shouldBuy: false,
        reason: "UNSUPPORTED_TIMEFRAME",
      };
    const now = Date.now(),
      bucket = Math.floor(now / 14_400_000),
      key = `${unified}:${timeframe}:${bucket}`;
    // Fail closed during finalization. The execution loop waits until second10;
    // an API read at second0 must not cache or execute an older candle.
    if (now % 14_400_000 < 10000)
      return {
        symbol: unified,
        timeframe,
        shouldBuy: false,
        reason: "WAITING_FOR_CANDLE_FINALIZATION",
      };
    const cached = this.cache.get(unified);
    if (cached?.bucket === bucket && cached.expiresAt > now)
      return cached.result;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const pending = analyzeMarket(unified, timeframe)
      .then((result) => {
        // Keep rejected/stale fetches retryable; do not pin a missing forming bar.
        if (result.candle)
          this.cache.set(unified, {
            bucket,
            expiresAt: Date.now() + 15000,
            result,
          });
        return result;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, pending);
    return pending;
  }
}
