import "reflect-metadata";
import { config } from "dotenv";
import { ConfigService } from "@nestjs/config";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { join } from "node:path";
import { rankEurMarkets } from "../../../src/production/market-data/trading-symbol";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { readKrakenCsv } from "../data/kraken-csv";
import { EmaRsiReplayStrategy } from "../strategies/ema-rsi-replay.strategy";
import { simulateSpotBasket } from "../backtesting/spot-basket-simulation";

/** Uses one pre-period liquidity selection and official independent 4h/daily sources. */
async function main() {
  config({ quiet: true });
  const { values } = parseArgs({
    options: {
      "data-dir": { type: "string" },
      output: { type: "string" },
      start: { type: "string", default: "2020-01-01T00:00:00Z" },
      end: { type: "string" },
    },
  });
  if (!values["data-dir"] || !values.output)
    throw new Error(
      "Require --data-dir <official EUR universe directory> --output <JSON> --start/--end.",
    );
  const directory = values["data-dir"],
    selection = JSON.parse(
      await fs.readFile(join(directory, "liquidity-selection.json"), "utf8"),
    );
  const symbols: string[] = selection.historicalCandidates.map(
    (r: { symbol: string }) => r.symbol,
  );
  if (symbols.length < 30 || new Set(symbols).size !== symbols.length)
    throw new Error("INVALID_HISTORICAL_UNIVERSE");
  const settings = new ConfigService(),
    evaluatedAt = Date.now(),
    holdoutDays = Number(settings.get("BACKTEST_HOLDOUT_DAYS", 365));
  if (!Number.isInteger(holdoutDays) || holdoutDays <= 0)
    throw new Error("Invalid protected holdout days.");
  const holdoutStart = evaluatedAt - holdoutDays * 86_400_000,
    start = Date.parse(values.start!),
    requestedEnd = values.end ? Date.parse(values.end) : holdoutStart,
    end = Math.min(requestedEnd, holdoutStart);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Invalid research date range.");
  const sources: Array<{
      symbol: string;
      csvSha256: string;
      fourHourRows: number;
      dailySha256: string;
    }> = [],
    datasets: Record<string, MarketCandle[]> = {};
  if (Date.parse(selection.rankingAt) > start)
    throw new Error("LOOKAHEAD_WATCHLIST_FORBIDDEN");
  const verifiedNoTradeCoverage: Record<
    string,
    { from: number; through: number }
  > = {};
  const dailyBooks = new Map<string, MarketCandle[]>();
  const strategy = new EmaRsiReplayStrategy(new RiskManagerService());
  for (const symbol of symbols) {
    const file = join(directory, `${symbol}_240.csv`),
      dailyFile = join(directory, `${symbol}_1440.csv`);
    const fullRows = await readKrakenCsv(file, symbol, Timeframe.FOUR_HOURS);
    const sha = createHash("sha256")
      .update(await fs.readFile(file))
      .digest("hex");
    const receipt = selection.files.find(
      (r: { symbol: string }) => r.symbol === symbol,
    );
    if (!receipt?.crcVerified || receipt.sha256 !== sha)
      throw new Error("UNVERIFIED_ARCHIVE_SOURCE");
    const rows = fullRows.filter(
      (c) => +c.time >= start && +c.time + 14_400_000 <= end,
    );
    verifiedNoTradeCoverage[symbol] = {
      from: Math.max(start, +fullRows[0].time),
      through: Math.min(end, +fullRows.at(-1)!.time + 14_400_000),
    };
    const daily = (
      await readKrakenCsv(dailyFile, symbol, Timeframe.ONE_DAY)
    ).filter((c) => +c.time + 86_400_000 <= end);
    strategy.setDailyHistory(symbol, daily);
    dailyBooks.set(symbol, daily);
    datasets[symbol] = rows;
    sources.push({
      symbol,
      csvSha256: sha,
      fourHourRows: rows.length,
      ...{
        dailySha256: createHash("sha256")
          .update(await fs.readFile(dailyFile))
          .digest("hex"),
      },
    });
  }
  let rankedDay = -1,
    rankedSymbols: string[] = [];
  const watchlistAt = (time: number) => {
    const day = Math.floor(time / 86_400_000) * 86_400_000;
    if (day !== rankedDay) {
      const pairs: Parameters<typeof rankEurMarkets>[0] = {},
        tickers: Parameters<typeof rankEurMarkets>[1] = {};
      for (const symbol of symbols) {
        const last = dailyBooks
          .get(symbol)!
          .filter((c) => +c.time + 86_400_000 <= day)
          .at(-1);
        if (!last || +last.time + 86_400_000 !== day) continue;
        pairs[symbol] = {
          wsname: `${symbol.slice(0, -3)}/EUR`,
          status: "online",
        };
        tickers[symbol] = {
          v: ["0", String(last.volume)],
          p: ["0", String(last.close)],
        };
      }
      rankedSymbols = rankEurMarkets(pairs, tickers).map((r) => r.symbol);
      rankedDay = day;
      if (rankedSymbols.length !== 30)
        throw new Error("INSUFFICIENT_30_MARKET_DAILY_LIQUIDITY");
    }
    return [...rankedSymbols];
  };
  const report = simulateSpotBasket(datasets, strategy, {
    continuousCommonWindow: false,
    watchlistAt,
    verifiedNoTradeCoverage,
    startingBalanceEUR: Number(settings.get("DEMO_STARTING_BALANCE_EUR", 1000)),
    riskPerTrade: Math.min(
      Number(settings.get("DEMO_RISK_PER_TRADE_PERCENT", 0.01)),
      0.01,
    ),
    maximumInvestedEUR: Math.min(
      Number(settings.get("DEMO_POSITION_SIZE_EUR", 100)),
      100,
    ),
  });
  const codeSha256 = Object.fromEntries(
    await Promise.all(
      [
        "src/production/trading/ccxt/analyze-market.ts",
        "src/production/trading/ema-rsi-spot.strategy.ts",
        "src/production/trading/maker-execution.ts",
        "src/production/trading/trade-execution.ts",
        "src/production/trading/spot-position-sizing.ts",
        "src/production/risk/risk-manager.service.ts",
        "test/research/backtesting/spot-basket-simulation.ts",
        "test/research/strategies/ema-rsi-replay.strategy.ts",
        "src/production/market-data/trading-symbol.ts",
        "test/research/data/kraken-csv.ts",
        "test/research/scripts/backtest-spot-basket.ts",
      ].map(async (file) => [
        file,
        createHash("sha256")
          .update(await fs.readFile(file))
          .digest("hex"),
      ]),
    ),
  );
  await fs.writeFile(
    values.output,
    JSON.stringify(
      {
        ...report,
        liquiditySelection: {
          ...selection,
          backtestSelection:
            "Daily top 30 by previous completed UTC daily close times volume; no future listings or turnover used. This is a volume proxy; historical 24h VWAP/order-book depth is unavailable.",
        },
        codeSha256,
        evaluatedAt: new Date(evaluatedAt),
        protectedHoldoutStart: new Date(holdoutStart),
        includesProtectedHoldout: false,
        sources,
        databaseWrites: 0,
        realOrders: 0,
        telegramMessages: 0,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      output: values.output,
      summary: report.summary,
      counters: report.counters,
      maximumConcurrentOpen: report.maximumConcurrentOpen,
    }),
  );
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Basket backtest failed.",
  );
  process.exitCode = 1;
});
