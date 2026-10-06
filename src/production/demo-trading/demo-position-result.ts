import { DemoPosition } from "./entities/demo-position.entity";
import { classifyNetResult } from "../trading/net-trade-result";

/** Read projection: never rewrite legacy rows whose stored R/status was gross. */
export function getDemoPositionResult(position: DemoPosition) {
  const entry = Number(position.entry);
  const risk = Math.abs(entry - Number(position.stopLoss));
  const quantity = Number(position.quantity);
  const pnl =
    position.realizedPnlQuote == null
      ? null
      : Number(position.realizedPnlQuote);
  const resultR =
    position.status !== "OPEN" &&
    pnl !== null &&
    Number.isFinite(pnl) &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(risk) &&
    risk > 0
      ? pnl / (quantity * risk)
      : null;
  return {
    netResult:
      position.status === "OPEN"
        ? ("OPEN" as const)
        : pnl === null || !Number.isFinite(pnl)
          ? ("UNKNOWN" as const)
          : classifyNetResult(pnl),
    resultR,
    grossResultR:
      position.exitPrice == null || risk <= 0
        ? null
        : (Number(position.exitPrice) - entry) / risk,
  };
}
