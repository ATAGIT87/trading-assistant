import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MarketDataService } from "../market-data/market-data.service";
import { timeframeDurationMs } from "../assets/timeframe.utils";
import { DemoTradingService } from "./demo-trading.service";

/** Exit/data reconciliation only. RunTradingAssistant owns all automated entries. */
@Injectable()
export class DemoTradingScheduler {
  private readonly logger = new Logger(DemoTradingScheduler.name);
  private running = false;
  private readonly syncedThrough = new Map<string, number>();

  constructor(
    private readonly demo: DemoTradingService,
    private readonly marketData: MarketDataService,
  ) {}

  @Cron("10 * * * * *")
  async handleDemoTradingCycle() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runCycle();
    } catch {
      this.logger.error(
        "Demo reconciliation failed; stored positions remain recoverable.",
      );
    } finally {
      this.running = false;
    }
  }

  private async runCycle() {
    const existing = await this.demo.getOpenPositions();
    const pending = await this.demo.getPendingMakerOrders();
    // The analysis runner owns the 30-market scan. Reconciliation fetches only
    // data required by persisted orders/positions, even when entries are paused.
    const markets = [
      ...new Map(
        [
          ...existing.map((p) => ({
            symbol: p.symbol,
            timeframe: p.executionTimeframe ?? p.timeframe,
          })),
          ...pending.map((p) => ({
            symbol: p.symbol,
            timeframe: this.demo.getMakerExecutionTimeframe(p),
          })),
          ...pending.map((p) => ({
            ...p,
            timeframe: this.demo.getMakerMacroTimeframe(p),
          })),
        ].map((m) => [`${m.symbol}:${m.timeframe}`, m]),
      ).values(),
    ];
    const requiredKeys = new Set(
      markets.map((m) => `${m.symbol}:${m.timeframe}`),
    );
    for (const key of this.syncedThrough.keys()) {
      if (!requiredKeys.has(key)) this.syncedThrough.delete(key);
    }
    if (!markets.length) return;
    for (const market of markets) {
      const key = `${market.symbol}:${market.timeframe}`;
      const duration = timeframeDurationMs[market.timeframe];
      const closedThrough = Math.floor(Date.now() / duration) * duration;
      if (this.syncedThrough.get(key) === closedThrough) continue;
      try {
        await this.marketData.syncSpotCandles(market.symbol, market.timeframe);
        const latest = await this.marketData.getLatestClosedCandle(
          market.symbol,
          market.timeframe,
        );
        // Missing/not-yet-finalized candles remain retryable within this hour.
        if (latest && +latest.time >= closedThrough - duration)
          this.syncedThrough.set(key, closedThrough);
      } catch {
        this.logger.warn(
          `Sync failed for ${market.symbol}; continuing exit reconciliation.`,
        );
      }
    }
    const result = await this.demo.checkOpenPositions();
    const closed = result.processed.filter(
      (p) => p.status === "WIN" || p.status === "LOSS",
    ).length;
    this.logger.log(
      JSON.stringify({ event: "DEMO_EXIT_RECONCILIATION", closed }),
    );
  }
}
