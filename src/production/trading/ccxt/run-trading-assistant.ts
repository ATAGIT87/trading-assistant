import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AlertDelivery } from "../../alerts/entities/alert-delivery.entity";
import { Timeframe } from "../../assets/enums/timeframe.enum";
import { DemoTradingService } from "../../demo-trading/demo-trading.service";
import { MarketAnalysis, EMA_RSI_STRATEGY_VERSION } from "./analyze-market";
import { SignalsService } from "../../signals/signals.service";
import { AssetsService } from "../../assets/assets.service";

@Injectable()
export class RunTradingAssistant
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RunTradingAssistant.name);
  private readonly intervalMs: number;
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  private inFlight: Promise<void> | null = null;
  private persistentDeduplicationActive = false;
  private lastRunAt: string | null = null;
  private lastResult: Omit<MarketAnalysis, "closedHistory"> | null = null;
  private lastError: string | null = null;
  private lastDemoReason: string | null = null;
  private readonly marketResults = new Map<
    string,
    { result: Omit<MarketAnalysis, "closedHistory">; demoReason: string | null }
  >();
  private enabledMarkets: string[] = [];

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AlertDelivery)
    private readonly ledger: Repository<AlertDelivery>,
    private readonly demo: DemoTradingService,
    private readonly signals: SignalsService,
    private readonly assets: AssetsService,
  ) {
    this.intervalMs = Number(config.get("CCXT_ASSISTANT_INTERVAL_MS", 60000));
    if (
      !Number.isInteger(this.intervalMs) ||
      this.intervalMs < 60000 ||
      this.intervalMs > 300000
    )
      throw new Error("CCXT interval must be between one and five minutes.");
  }

  onApplicationBootstrap(): void {
    if (
      this.config.get("CCXT_ASSISTANT_ENABLED", "false") === "true" &&
      this.signals.isUnifiedStrategyActive()
    )
      this.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.stop();
    // Allow an already-started atomic demo commit to finish before DB shutdown.
    await this.inFlight;
  }

  start(): void {
    if (this.active || !this.signals.isUnifiedStrategyActive()) return;
    this.active = true;
    this.schedule(0);
  }

  stop(): void {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  status() {
    return {
      active: this.active,
      executing: this.inFlight !== null,
      symbol: "BTC/EUR", // Backwards-compatible primary-market field.
      symbols: this.enabledMarkets,
      strategyVersion: EMA_RSI_STRATEGY_VERSION,
      entryOwner: "RunTradingAssistant",
      unifiedStrategyActive: this.signals.isUnifiedStrategyActive(),
      markets: Object.fromEntries(this.marketResults),
      timeframe: "1h",
      intervalMs: this.intervalMs,
      persistentDeduplication: {
        active: this.persistentDeduplicationActive,
        storage: "alert_delivery",
        key: ["symbol", "timeframe", "candleTime", "CCXT_SIGNAL_COMMITTED"],
      },
      lastRunAt: this.lastRunAt,
      lastResult: this.lastResult,
      lastReason: this.lastResult?.reason ?? null,
      lastDemoReason: this.lastDemoReason,
      lastError: this.lastError,
      telegram: "PERSISTENT_DEMO_OUTBOX",
      exitMonitoring: {
        pollCadenceMs: 60_000,
        entryTimeframe: "1h",
        intrahourFeed: "CLOSED_1M_CANDLES",
        mode: "SIMULATED",
        nativeExchangeStop: false,
      },
    };
  }

  private schedule(delay: number): void {
    if (!this.active) return;
    const hourAge = Date.now() % 3_600_000;
    const safetyDelay =
      delay === 0 && hourAge < 10000 ? 10000 - hourAge : delay;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.active) return;
      // Re-check at execution time: a normal interval may land at the hour boundary.
      if (Date.now() % 3_600_000 < 10000) {
        this.schedule(0);
        return;
      }
      this.inFlight = this.runOnce().finally(() => {
        this.inFlight = null;
        this.schedule(this.intervalMs);
      });
    }, safetyDelay);
  }

  private async analyzeAndExecute(symbol: string): Promise<void> {
    const result = await this.signals.getMarketAnalysis(
      symbol,
      Timeframe.ONE_HOUR,
    );
    const { closedHistory: _history, ...summary } = result;
    this.marketResults.set(symbol, { result: summary, demoReason: null });
    if (symbol === "BTCEUR") {
      this.lastResult = summary;
      this.lastDemoReason = null;
    }
    this.logger.log(
      JSON.stringify({
        event: "MARKET_ANALYSIS",
        symbol,
        reason: result.reason,
        candleTimestamp: result.candle?.timestamp,
        shouldBuy: result.shouldBuy,
      }),
    );
    if (!this.active || !result.shouldBuy) return;
    if (!result.candle) throw new Error("Missing evaluated candle.");
    const seen = await this.ledger.existsBy({
      symbol,
      timeframe: Timeframe.ONE_HOUR,
      candleTime: new Date(result.candle.timestamp),
      action: "CCXT_SIGNAL_COMMITTED",
    });
    let demoReason: string;
    if (seen) demoReason = "Signal already committed.";
    else {
      if (!this.active) return;
      const decision = await this.demo.openCcxtPosition(result);
      demoReason = decision.reason;
      this.logger.log(
        JSON.stringify({
          event: "UNIFIED_DEMO_DECISION",
          symbol,
          reason: result.reason,
          demoReason,
          positionId: decision.position?.id,
        }),
      );
    }
    this.marketResults.set(symbol, { result: summary, demoReason });
    if (symbol === "BTCEUR") this.lastDemoReason = demoReason;
  }

  private async runOnce(): Promise<void> {
    this.lastRunAt = new Date().toISOString();
    this.lastDemoReason = null;
    try {
      // Probe the actual mapped schema, including the migration-required payload.
      await this.ledger.find({ take: 1 });
      this.persistentDeduplicationActive = true;
      const activeAssets = (await this.assets.findActive()).filter(
        (asset) => asset.timeframe === Timeframe.ONE_HOUR,
      );
      this.enabledMarkets = activeAssets.map((asset) => asset.symbol);
      this.lastError = null;
      for (const asset of activeAssets) {
        if (!this.active) break;
        try {
          await this.analyzeAndExecute(asset.symbol);
        } catch {
          this.lastError = `Analysis or demo integration failed for ${asset.symbol}; next cycle will retry.`;
          this.logger.error(this.lastError);
        }
      }
    } catch {
      // DB or transport failure is retryable; no premature persistent claim.
      this.persistentDeduplicationActive = false;
      this.lastError =
        "CCXT analysis or persistent demo integration failed; next cycle will retry.";
      this.logger.error(this.lastError);
    }
  }
}
