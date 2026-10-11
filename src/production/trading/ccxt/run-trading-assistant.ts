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
import { MarketAnalysis, SPOT_STRATEGY_VERSION } from "./analyze-market";
import { SignalsService } from "../../signals/signals.service";
import {
  supportedTradingSymbols,
  refreshTradingWatchlist,
  watchlistStatus,
} from "../../market-data/trading-symbol";

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

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AlertDelivery)
    private readonly ledger: Repository<AlertDelivery>,
    private readonly demo: DemoTradingService,
    private readonly signals: SignalsService,
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
      symbols: [...supportedTradingSymbols],
      watchlist: watchlistStatus(),
      strategyVersion: SPOT_STRATEGY_VERSION,
      entryOwner: "RunTradingAssistant",
      unifiedStrategyActive: this.signals.isUnifiedStrategyActive(),
      markets: Object.fromEntries(this.marketResults),
      timeframe: "4h",
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
        entryTimeframe: "4h",
        executionTimeframe: "1h",
        legacyExecution: "STORED_POSITION_TIMEFRAME",
        feed: "CLOSED_1H_CANDLES",
        orderType: "limit",
        postOnly: true,
        postOnlyAppliesTo: "ENTRY_AND_TAKE_PROFIT",
        stopOrderType: "market",
        legacyStopPolicy: "STORED_POSITION_POLICY_OR_MAKER_ONLY",
        maximumPositions: 6,
        capacityCounts: "FILLED_OPEN_ONLY",
        pendingTTLHours: 24,
        mode: "SIMULATED",
        nativeExchangeStop: false,
      },
    };
  }

  private schedule(delay: number): void {
    if (!this.active) return;
    const hourAge = Date.now() % 14_400_000;
    const safetyDelay =
      delay === 0 && hourAge < 10000 ? 10000 - hourAge : delay;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.active) return;
      // Re-check at execution time: a normal interval may land at the hour boundary.
      if (Date.now() % 14_400_000 < 10000) {
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
      Timeframe.FOUR_HOURS,
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
      timeframe: Timeframe.FOUR_HOURS,
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
      this.lastError = null;
      await refreshTradingWatchlist();
      for (const symbol of [...supportedTradingSymbols]) {
        if (!this.active) break;
        try {
          await this.analyzeAndExecute(symbol);
        } catch {
          this.lastError = `Analysis or demo integration failed for ${symbol}; next cycle will retry.`;
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
