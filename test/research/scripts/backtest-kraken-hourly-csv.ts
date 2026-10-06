import "reflect-metadata";
import { config as loadEnvironment } from "dotenv";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import {
  readKrakenHourlyCsv,
  splitContinuousHourlySegments,
} from "../data/kraken-hourly-csv";
import { MarketDataService } from "../../../src/production/market-data/market-data.service";
import { EmaRsiReplayStrategy } from "../strategies/ema-rsi-replay.strategy";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { ResearchStrategyRegistryService } from "../strategies/research-strategy-registry.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { StrategyEvidence } from "../../../src/production/strategy-approval/entities/strategy-evidence.entity";
import { StrategyEvidenceResult } from "../../../src/production/strategy-approval/evidence-result";
import {
  evaluateClosedMarket,
  hasOversoldHook,
} from "../../../src/production/trading/ccxt/analyze-market";
import { RSI } from "technicalindicators";

/** Read-only, detached production-engine backtest: no DB, Nest bootstrap or transport. */
async function main() {
  loadEnvironment({ quiet: true });
  const { values } = parseArgs({
    options: {
      btc: { type: "string" },
      eth: { type: "string" },
      start: { type: "string", default: "2020-01-01T00:00:00Z" },
      output: { type: "string" },
    },
  });
  if (!values.btc || !values.eth || !values.output)
    throw new Error(
      "Usage: pnpm backtest:kraken-csv --btc <csv> --eth <csv> --output <json> [--start <UTC date>]",
    );
  const start = +new Date(values.start!);
  if (!Number.isFinite(start)) throw new Error("Invalid start date.");
  const config = new ConfigService();
  const holdoutDays = Number(config.get("BACKTEST_HOLDOUT_DAYS", 365));
  if (!Number.isInteger(holdoutDays) || holdoutDays <= 0)
    throw new Error("Holdout days must be a positive integer.");
  const evaluatedAt = new Date();
  const holdoutStart = new Date(+evaluatedAt - holdoutDays * 86_400_000);
  const strategy = new EmaRsiReplayStrategy(new RiskManagerService());
  const registry = {
    get: () => strategy,
  } as unknown as ResearchStrategyRegistryService;
  // saveRun writes only to this detached adapter; PostgreSQL is never connected.
  const detachedRepository = {
    create: (value: unknown) => value,
    save: async (value: unknown) => value,
  } as unknown as Repository<StrategyEvidence>;
  const report = {
    evaluatedAt,
    strategyVersion: strategy.version,
    source: "Official Kraken OHLCVT CSV",
    executionResolution: "1h",
    start: new Date(start),
    protectedHoldoutStart: holdoutStart,
    includesProtectedHoldout: false,
    costs: {
      feePerSide: Number(config.get("BACKTESTING_FEE_RATE", 0.0005)),
      slippagePerSide: Number(config.get("BACKTESTING_SLIPPAGE_RATE", 0.0005)),
    },
    databaseWrites: 0,
    telegramMessages: 0,
    realOrders: 0,
    methodology:
      "Production signal/risk and shared fill/outcome rules on hourly bars; not validation of live 1m exit timing. Independent continuous segments and train/validation/test periods; incomplete trades at boundaries remain OPEN, never fabricated exits. R summaries are not EUR portfolio returns.",
    markets: [] as Array<Record<string, unknown>>,
  };
  for (const [symbol, source] of [
    ["BTCEUR", values.btc],
    ["ETHEUR", values.eth],
  ] as const) {
    const all = await readKrakenHourlyCsv(source, symbol);
    const rows = all.filter(
      (c) => +c.time >= start && +c.time + 3_600_000 <= +evaluatedAt,
    );
    const selection = rows.filter((c) => +c.time + 3_600_000 <= +holdoutStart);
    const segments = splitContinuousHourlySegments(selection);
    const stats = {
      evaluated: 0,
      warmup: 0,
      aboveEma: 0,
      hooks: 0,
      hooksAboveEma: 0,
      buys: 0,
      reasons: {} as Record<string, number>,
    };
    const results: Array<{
      first: Date;
      last: Date;
      candles: number;
      result: StrategyEvidenceResult;
    }> = [];
    for (const segment of segments) {
      for (let i = 0; i < segment.length; i++) {
        const history = segment.slice(Math.max(0, i - 198), i + 1).map((c) => ({
          timestamp: +c.time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));
        const analysis = evaluateClosedMarket(
          symbol,
          "1h",
          history,
          3_600_000,
          +segment[i].time + 3_600_000,
        );
        stats.reasons[analysis.reason] =
          (stats.reasons[analysis.reason] ?? 0) + 1;
        if (!analysis.candle) {
          stats.warmup++;
          continue;
        }
        stats.evaluated++;
        const above = analysis.candle.close > analysis.ema50!;
        if (above) stats.aboveEma++;
        const hook = hasOversoldHook(
          RSI.calculate({ period: 14, values: history.map((c) => c.close) }),
        );
        if (hook) {
          stats.hooks++;
          if (above) stats.hooksAboveEma++;
        }
        if (analysis.shouldBuy) stats.buys++;
      }
      if (segment.length < strategy.minimumHistory + 2) continue;
      const marketData = {
        getHistoricalCandles: async () => segment,
      } as unknown as MarketDataService;
      const engine = new BacktestingService(
        marketData,
        registry,
        config,
        detachedRepository,
      );
      const result = await engine.run(
        symbol,
        Timeframe.ONE_HOUR,
        strategy.version,
        false,
      );
      results.push({
        first: segment[0].time,
        last: segment.at(-1)!.time,
        candles: segment.length,
        result,
      });
    }
    const trades = results.flatMap((r) => r.result.trades);
    const closed = trades.filter((t) => t.resultR !== null),
      wins = closed.filter((t) => t.resultR! > 0),
      losses = closed.filter((t) => t.resultR! < 0);
    const totalR = closed.reduce((sum, t) => sum + t.resultR!, 0);
    const grossProfit = closed.reduce(
        (sum, t) => sum + Math.max(t.resultR!, 0),
        0,
      ),
      grossLoss = closed.reduce((sum, t) => sum - Math.min(t.resultR!, 0), 0);
    const periods = Object.fromEntries(
      ["training", "validation", "test"].map((period) => {
        const matching = closed.filter((t) => t.segment === period);
        return [
          period,
          {
            closedTrades: matching.length,
            wins: matching.filter((t) => t.resultR! > 0).length,
            losses: matching.filter((t) => t.resultR! < 0).length,
            totalR: matching.reduce((s, t) => s + t.resultR!, 0),
          },
        ];
      }),
    );
    report.markets.push({
      symbol,
      csvSha256: createHash("sha256")
        .update(await fs.readFile(source))
        .digest("hex"),
      archiveCandles: all.length,
      scopedCandles: rows.length,
      first: rows[0]?.time,
      last: rows.at(-1)?.time,
      selectionCandles: selection.length,
      untouchedHoldoutCandles: rows.length - selection.length,
      continuousSegments: segments.length,
      gaps: segments.slice(1).map((s, i) => ({
        after: segments[i].at(-1)!.time,
        before: s[0].time,
        missingHours: (+s[0].time - +segments[i].at(-1)!.time) / 3_600_000 - 1,
      })),
      signals: stats,
      sequential: {
        entries: trades.length,
        closed: closed.length,
        wins: wins.length,
        losses: losses.length,
        openAtSegmentBoundaries: trades.length - closed.length,
        netTotalR: totalR,
        expectancyR: closed.length ? totalR / closed.length : null,
        profitFactor: grossLoss ? grossProfit / grossLoss : null,
        periods,
      },
      segments: results,
    });
    console.log(
      JSON.stringify({
        symbol,
        signals: stats,
        sequential: report.markets.at(-1)!.sequential,
        selectionCandles: selection.length,
        untouchedHoldoutCandles: rows.length - selection.length,
        segments: segments.length,
      }),
    );
  }
  await fs.writeFile(values.output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      output: values.output,
      strategyVersion: strategy.version,
      databaseWrites: 0,
      protectedHoldoutStart: holdoutStart,
    }),
  );
}
void main().catch(() => {
  console.error(
    "CSV backtest failed; no database writes or notifications were made.",
  );
  process.exitCode = 1;
});
