import { EMA_RSI_STRATEGY_VERSION } from "./ccxt/analyze-market";

export interface PositionExitPolicy {
  maxHoldingCandles: number | null;
  profitProtection: boolean;
}

/** Compatibility for persisted positions; historical entry implementations stay in test/. */
export function getPositionExitPolicy(
  version: string | null,
): PositionExitPolicy {
  switch (version) {
    case EMA_RSI_STRATEGY_VERSION:
      return {
        maxHoldingCandles: Number.MAX_SAFE_INTEGER,
        profitProtection: false,
      };
    case "research-hourly-4h-trend-volume-v1":
      return { maxHoldingCandles: 24, profitProtection: false };
    case "research-hourly-profit-exit-v2":
    case "research-hourly-profit-exit-v3":
    case "research-hourly-setup-structure-v6":
    case "research-hourly-integrated-spot-v7":
      return { maxHoldingCandles: 24, profitProtection: true };
    default:
      return { maxHoldingCandles: null, profitProtection: false };
  }
}
