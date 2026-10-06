import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { MarketDataService } from "../market-data/market-data.service";
import { AssetsService } from "../assets/assets.service";
import { DemoTradingService } from "./demo-trading.service";

/** Exit/data reconciliation only. RunTradingAssistant owns all automated entries. */
@Injectable()
export class DemoTradingScheduler {
  private readonly logger = new Logger(DemoTradingScheduler.name);
  private running = false;

  constructor(
    private readonly demo: DemoTradingService,
    private readonly marketData: MarketDataService,
    private readonly assets: AssetsService,
    private readonly config: ConfigService,
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
    const approved =
      this.config.get("DEMO_TRADING_ENABLED", "false") === "true";
    const start = new Date(
      this.config.get<string>("EXPLORATORY_DEMO_START_AT", ""),
    );
    const experimental =
      this.config.get("EXPLORATORY_DEMO_ENABLED", "false") === "true" &&
      Number.isFinite(+start) &&
      Date.now() >= +start;
    if (!approved && !experimental && !existing.length) return;

    // Entry switches never disable monitoring already-open positions.
    const active =
      approved || experimental ? await this.assets.findActive() : [];
    const markets = [
      ...new Map(
        [...active, ...existing].map((m) => [`${m.symbol}:${m.timeframe}`, m]),
      ).values(),
    ];
    for (const market of markets) {
      try {
        await this.marketData.syncSpotCandles(market.symbol, market.timeframe);
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
