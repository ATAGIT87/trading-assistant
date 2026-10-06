import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DataSource } from "typeorm";
import { ModulesContainer, NestFactory } from "@nestjs/core";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { SchedulerRegistry } from "@nestjs/schedule";

function registeredRoutes(modules: ModulesContainer): string[] {
  const routes = new Set<string>();
  for (const module of modules.values()) {
    for (const controller of module.controllers.values()) {
      const type = controller.metatype;
      if (!type) continue;
      const prefix = Reflect.getMetadata(PATH_METADATA, type) as string;
      for (const name of Object.getOwnPropertyNames(type.prototype)) {
        const handler = type.prototype[name] as unknown;
        if (typeof handler !== "function") continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (method === undefined) continue;
        const path = Reflect.getMetadata(PATH_METADATA, handler) as string;
        const fullPath = [prefix, path]
          .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
          .join("/");
        routes.add(`${RequestMethod[method]} /${fullPath}`);
      }
    }
  }
  return [...routes].sort();
}

const productionRoutes = [
  "GET /assets",
  "GET /assets/active",
  "GET /assets/:id",
  "POST /assets",
  "PATCH /assets/:id",
  "DELETE /assets/:id",
  "GET /market-data/candles/:symbol/:timeframe",
  "GET /market-data/candles/:symbol/:timeframe/latest",
  "GET /market-data/candles/:symbol/:timeframe/quality",
  "POST /market-data/sync-spot/:symbol/:timeframe",
  "POST /market-data/repair-spot-gaps/:symbol/:timeframe",
  "GET /signals/:symbol/:timeframe",
  "GET /technical-analysis/:symbol",
  "GET /trading-assistant/status",
  "POST /demo-trading/open/:symbol/:timeframe",
  "GET /demo-trading/open",
  "POST /demo-trading/check",
  "GET /demo-trading/history",
  "GET /demo-trading/summary",
].sort();

test("production and research resolve their own dependency graphs without database connections", async () => {
  const switches = {
    ACTIVE_STRATEGY_VERSION: "ccxt-ema50-rsi14-v1",
    CCXT_ASSISTANT_ENABLED: "false",
    DEMO_TRADING_ENABLED: "false",
    EXPLORATORY_DEMO_ENABLED: "false",
    DEMO_ENTRIES_PAUSED: "true",
    DB_SYNCHRONIZE: "false",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
  };
  const previous = Object.fromEntries(
    Object.keys(switches).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, switches);
  const initialize = DataSource.prototype.initialize;
  const destroy = DataSource.prototype.destroy;
  // Build real entity metadata and repositories, but never create a PG pool or execute SQL.
  DataSource.prototype.initialize = async function () {
    const buildMetadata = Reflect.get(
      this,
      "buildMetadatas",
    ) as () => Promise<void>;
    await buildMetadata.call(this);
    Object.defineProperty(this, "isInitialized", {
      value: true,
      writable: true,
      configurable: true,
    });
    return this;
  };
  DataSource.prototype.destroy = async function () {
    Object.defineProperty(this, "isInitialized", {
      value: false,
      writable: true,
      configurable: true,
    });
  };
  try {
    const { AppModule } = await import("../../src/production/app.module.js");
    const { ResearchModule } = await import("../research/research.module.js");
    const { BacktestingController } =
      await import("../research/backtesting/backtesting.controller.js");
    const { BacktestingService } =
      await import("../research/backtesting/backtesting.service.js");
    const { DemoTradingService } =
      await import("../../src/production/demo-trading/demo-trading.service.js");
    const { ResearchStrategyRegistryService } =
      await import("../research/strategies/research-strategy-registry.service.js");
    const { IndicatorsService } =
      await import("../research/indicators/indicators.service.js");
    const { ResearchMarketDataService } =
      await import("../research/data/research-market-data.service.js");
    for (const [module, research] of [
      [AppModule, false],
      [ResearchModule, true],
    ] as const) {
      const app = await NestFactory.createApplicationContext(module, {
        logger: false,
        abortOnError: false,
      });
      try {
        for (const job of app.get(SchedulerRegistry).getCronJobs().values())
          job.stop();
        assert(app.get(DemoTradingService) instanceof DemoTradingService);
        assert.equal(app.get(DataSource).isInitialized, true);
        const routes = registeredRoutes(app.get(ModulesContainer));
        if (research) {
          assert(routes.includes("POST /research-data/build-4h/:symbol"));
          assert(routes.includes("GET /backtesting/readiness/:timeframe"));
          assert(app.get(IndicatorsService) instanceof IndicatorsService);
          assert(
            app.get(ResearchMarketDataService) instanceof
              ResearchMarketDataService,
          );
          assert(
            app.get(BacktestingController) instanceof BacktestingController,
          );
          assert(app.get(BacktestingService) instanceof BacktestingService);
          assert.equal(
            app
              .get(ResearchStrategyRegistryService)
              .get("research-hourly-integrated-spot-v7").version,
            "research-hourly-integrated-spot-v7",
          );
        } else {
          assert.deepEqual(routes, productionRoutes);
          assert.throws(() => app.get(BacktestingController));
          assert.throws(() => app.get(BacktestingService));
          assert.throws(() => app.get(ResearchStrategyRegistryService));
          assert.throws(() => app.get(IndicatorsService));
          assert.throws(() => app.get(ResearchMarketDataService));
        }
      } finally {
        await app.close();
      }
    }
  } finally {
    DataSource.prototype.initialize = initialize;
    DataSource.prototype.destroy = destroy;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
