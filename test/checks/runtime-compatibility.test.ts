import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { getMetadataArgsStorage, Repository } from "typeorm";
import { IndicatorsService } from "../research/indicators/indicators.service";
import { RiskManagerService } from "../../src/production/risk/risk-manager.service";
import { EmaRsiSpotStrategy } from "../../src/production/trading/ema-rsi-spot.strategy";
import { getPositionExitPolicy } from "../../src/production/trading/position-exit-policy";
import { findTradeOutcome } from "../../src/production/trading/trade-outcome";
import { StrategyRegistryService } from "../../src/production/signals/strategy-registry.service";
import { TradingSignal } from "../../src/production/signals/signal.types";
import { MarketCandle } from "../../src/production/market-data/entities/market-candle.entity";
import { Timeframe } from "../../src/production/assets/enums/timeframe.enum";
import { StrategyEvidence } from "../../src/production/strategy-approval/entities/strategy-evidence.entity";
import { StrategyApprovalService } from "../../src/production/strategy-approval/strategy-approval.service";
import { StrategyEvidenceResult } from "../../src/production/strategy-approval/evidence-result";
import { TechnicalTrendEngine } from "../research/strategies/technical-trend-engine";
import { HourlyFourHourVolumeResearchStrategy } from "../research/strategies/hourly-four-hour-volume-research.strategy";
import { HourlyProfitExitResearchStrategy } from "../research/strategies/hourly-profit-exit-research.strategy";
import { HourlyTechnicalQualityResearchStrategy } from "../research/strategies/hourly-technical-quality-research.strategy";
import { HourlySetupStructureResearchStrategy } from "../research/strategies/hourly-setup-structure-research.strategy";
import { HourlyIntegratedSpotResearchStrategy } from "../research/strategies/hourly-integrated-spot-research.strategy";

const config = new ConfigService({
  ACTIVE_STRATEGY_VERSION: "ccxt-ema50-rsi14-v1",
});
const risk = new RiskManagerService();
const indicators = new IndicatorsService();

test("persisted legacy positions keep the exit policy of their original strategy", () => {
  const strategies = [
    new HourlyFourHourVolumeResearchStrategy(indicators, risk, config),
    new HourlyProfitExitResearchStrategy(indicators, risk, config),
    new HourlyTechnicalQualityResearchStrategy(indicators, risk, config),
    new HourlySetupStructureResearchStrategy(indicators, risk, config),
    new HourlyIntegratedSpotResearchStrategy(
      indicators,
      risk,
      config,
      new TechnicalTrendEngine(indicators),
    ),
  ];
  for (const strategy of strategies)
    assert.deepEqual(getPositionExitPolicy(strategy.version), {
      maxHoldingCandles: strategy.maxHoldingCandles,
      profitProtection:
        "profitProtection" in strategy && strategy.profitProtection === true,
    });
  assert.deepEqual(getPositionExitPolicy("ccxt-ema50-rsi14-v1"), {
    maxHoldingCandles: Number.MAX_SAFE_INTEGER,
    profitProtection: false,
  });
  assert.deepEqual(getPositionExitPolicy("retired-unknown"), {
    maxHoldingCandles: null,
    profitProtection: false,
  });
});

test("shared exit engine keeps conservative intrabar fills and legacy time exits", () => {
  const signal = {
    action: "BUY",
    entryPrice: 100,
    stopLoss: 90,
    takeProfit: 120,
  } as TradingSignal;
  const bothTouched = findTradeOutcome(
    signal,
    [{ open: "85", low: "80", high: "125", close: "110" } as MarketCandle],
    24,
  );
  assert.equal(bothTouched.exitReason, "STOP_LOSS");
  assert.equal(bothTouched.exitPrice, 85);
  const bars = Array.from(
    { length: 24 },
    () =>
      ({ open: "100", low: "95", high: "105", close: "101" }) as MarketCandle,
  );
  assert.equal(findTradeOutcome(signal, bars, 24).exitReason, "TIME_EXIT");
  assert.equal(
    findTradeOutcome(signal, bars, Number.MAX_SAFE_INTEGER).exitIndex,
    null,
  );
});

test("moving the evidence entity preserves its table and JSON column", () => {
  const metadata = getMetadataArgsStorage();
  assert.equal(
    metadata.tables.find((table) => table.target === StrategyEvidence)?.name,
    "backtest_run",
  );
  assert.equal(
    metadata.columns.find(
      (column) =>
        column.target === StrategyEvidence && column.propertyName === "result",
    )?.options.type,
    "jsonb",
  );
});

test("production rejects a historical strategy as the active entry strategy", () => {
  assert.throws(
    () =>
      new StrategyRegistryService(
        new ConfigService({
          ACTIVE_STRATEGY_VERSION: "research-hourly-integrated-spot-v7",
        }),
        new EmaRsiSpotStrategy(risk),
      ),
    /Only ccxt-ema50-rsi14-v1/,
  );
});

test("the extracted admission reader still blocks missing evidence and protected holdout", async () => {
  const registry = new StrategyRegistryService(
    config,
    new EmaRsiSpotStrategy(risk),
  );
  const empty = {
    find: async () => [],
  } as unknown as Repository<StrategyEvidence>;
  const missing = await new StrategyApprovalService(
    registry,
    config,
    empty,
  ).getReadiness(Timeframe.ONE_HOUR);
  assert.equal(missing.isReady, false);
  assert.match(missing.reason, /missing current runs/);
  const incomplete = {
    find: async () =>
      ["BTCEUR", "ETHEUR"].map((symbol) => ({
        symbol,
        result: {
          researchContext: { engineVersion: "spot-long-only-v6" },
          dataQuality: {
            primary: { isUsableForResearch: true },
            higherTimeframe: null,
          },
          includesProtectedHoldout: false,
        } as StrategyEvidenceResult,
      })),
  } as unknown as Repository<StrategyEvidence>;
  const blocked = await new StrategyApprovalService(
    registry,
    config,
    incomplete,
  ).getReadiness(Timeframe.ONE_HOUR);
  assert.equal(blocked.isReady, false);
  assert.match(blocked.reason, /separate protected holdout/);
});

test("hourly and unlabelled backtests cannot approve the minute-monitored Demo", async () => {
  const registry = new StrategyRegistryService(
    config,
    new EmaRsiSpotStrategy(risk),
  );
  for (const resolution of ["1h", undefined] as const) {
    const repository = {
      find: async () =>
        ["BTCEUR", "ETHEUR"].map((symbol) => ({
          symbol,
          result: {
            researchContext: {
              engineVersion: "spot-long-only-v6",
              executionResolution: resolution,
            },
            dataQuality: {
              primary: { isUsableForResearch: true },
              higherTimeframe: null,
            },
            includesProtectedHoldout: true,
            protectedHoldout: {},
          } as StrategyEvidenceResult,
        })),
    } as unknown as Repository<StrategyEvidence>;
    const result = await new StrategyApprovalService(
      registry,
      config,
      repository,
    ).getReadiness(Timeframe.ONE_HOUR);
    assert.equal(result.isReady, false);
    assert.match(result.reason, /1m execution evidence/);
  }
});
