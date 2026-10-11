import { supportedTradingSymbols } from "../../src/production/market-data/trading-symbol";
import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { getMetadataArgsStorage, Repository } from "typeorm";
import { RiskManagerService } from "../../src/production/risk/risk-manager.service";
import { EmaRsiSpotStrategy } from "../../src/production/trading/ema-rsi-spot.strategy";
import { StrategyRegistryService } from "../../src/production/signals/strategy-registry.service";
import { Timeframe } from "../../src/production/assets/enums/timeframe.enum";
import { StrategyEvidence } from "../../src/production/strategy-approval/entities/strategy-evidence.entity";
import { StrategyApprovalService } from "../../src/production/strategy-approval/strategy-approval.service";
import { StrategyEvidenceResult } from "../../src/production/strategy-approval/evidence-result";

const config = new ConfigService({
  ACTIVE_STRATEGY_VERSION: "spot-4h-pullback-daily-ema200-basket-v4",
});
const risk = new RiskManagerService();

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
    /Only spot-4h-pullback-daily-ema200-basket-v4/,
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
    empty,
  ).getReadiness(Timeframe.FOUR_HOURS);
  assert.equal(missing.isReady, false);
  assert.match(missing.reason, /missing current runs/);
  const incomplete = {
    find: async () =>
      supportedTradingSymbols.map((symbol) => ({
        symbol,
        result: {
          researchContext: { engineVersion: "spot-daily-4h-signal-1h-execution-v4" },
          dataQuality: {
            primary: { isUsableForResearch: true },
            higherTimeframe: { isUsableForResearch: true },
          },
          includesProtectedHoldout: false,
        } as StrategyEvidenceResult,
      })),
  } as unknown as Repository<StrategyEvidence>;
  const blocked = await new StrategyApprovalService(
    registry,
    incomplete,
  ).getReadiness(Timeframe.FOUR_HOURS);
  assert.equal(blocked.isReady, false);
  assert.match(blocked.reason, /separate protected holdout/);
});

test("OHLC and unlabelled backtests cannot approve Maker-only Demo", async () => {
  const registry = new StrategyRegistryService(
    config,
    new EmaRsiSpotStrategy(risk),
  );
  for (const resolution of ["1h", "4h", undefined] as const) {
    const repository = {
      find: async () =>
        supportedTradingSymbols.map((symbol) => ({
          symbol,
          result: {
            researchContext: {
              engineVersion: "spot-daily-4h-signal-1h-execution-v4",
              executionResolution: resolution,
            },
            dataQuality: {
              primary: { isUsableForResearch: true },
              higherTimeframe: { isUsableForResearch: true },
            },
            includesProtectedHoldout: true,
            protectedHoldout: {},
          } as StrategyEvidenceResult,
        })),
    } as unknown as Repository<StrategyEvidence>;
    const result = await new StrategyApprovalService(
      registry,
      repository,
    ).getReadiness(Timeframe.FOUR_HOURS);
    assert.equal(result.isReady, false);
    assert.match(result.reason, /validated 4h post-only execution evidence/);
  }
});
