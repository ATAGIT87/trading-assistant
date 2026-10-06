export type NetTradeResult = "OPEN" | "WIN" | "LOSS" | "BREAKEVEN";

/** Classification is independent of whether the exit was TP, SL, or time. */
export function classifyNetResult(value: number | null): NetTradeResult {
  if (value === null) return "OPEN";
  if (!Number.isFinite(value)) throw new Error("Invalid net trade result");
  return value > 0 ? "WIN" : value < 0 ? "LOSS" : "BREAKEVEN";
}
