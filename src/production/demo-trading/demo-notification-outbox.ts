import { Repository } from "typeorm";
import { AlertDelivery } from "../alerts/entities/alert-delivery.entity";
import { DemoPosition } from "./entities/demo-position.entity";

/** Reuses the existing varchar action ledger; both writes commit or roll back together. */
export async function savePositionWithNotification(
  repository: Repository<DemoPosition>,
  position: DemoPosition,
  kind: "OPEN" | "CLOSE",
  signalEvent?: { candleTime: Date; reason: string; currentPrice?: number },
): Promise<DemoPosition> {
  return repository.manager.transaction(async (manager) => {
    if (signalEvent) {
      // Existing unique ledger constraint serializes identical signals across restarts/processes.
      await manager.insert(AlertDelivery, {
        symbol: position.symbol,
        timeframe: position.timeframe,
        candleTime: signalEvent.candleTime,
        action: "CCXT_SIGNAL_COMMITTED",
      });
    }
    const saved = await manager.save(DemoPosition, position);
    await manager.insert(AlertDelivery, {
      symbol: saved.symbol,
      timeframe: saved.timeframe,
      candleTime: kind === "OPEN" ? saved.openedAt : saved.closedAt!,
      action: `DEMO_${kind}_PENDING:${saved.id}`,
      payload: signalEvent
        ? { reason: signalEvent.reason, currentPrice: signalEvent.currentPrice }
        : null,
    });
    return saved;
  });
}
