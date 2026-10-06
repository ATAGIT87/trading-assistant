import "dotenv/config";
import { createReadStream, promises as fs } from "node:fs";
import { createInterface } from "node:readline";
import { Client } from "pg";

type CandleRow = {
  time: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

const HOUR_MS = 60 * 60 * 1000;
const BATCH_SIZE = 500;
const [symbol, ...rawArguments] = process.argv.slice(2);
const deleteSource = rawArguments.includes("--delete-source");
const sources = rawArguments.filter(
  (argument) => argument !== "--delete-source",
);

if ((symbol !== "BTCEUR" && symbol !== "ETHEUR") || sources.length === 0) {
  throw new Error(
    "Usage: pnpm exec tsx operations/scripts/import-kraken-hourly-csv.ts <BTCEUR|ETHEUR> <csv...> [--delete-source]",
  );
}

async function main() {
  const rows = (await Promise.all(sources.map(readKrakenHourlyCsv)))
    .flat()
    .sort((left, right) => left.time.getTime() - right.time.getTime());
  const uniqueRows = [
    ...new Map(rows.map((row) => [row.time.getTime(), row])).values(),
  ];
  assertContinuous(uniqueRows, "source files");

  const client = new Client({
    host: required("DB_HOST"),
    port: Number(required("DB_PORT")),
    user: required("DB_USERNAME"),
    password: required("DB_PASSWORD"),
    database: required("DB_DATABASE"),
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    for (let index = 0; index < uniqueRows.length; index += BATCH_SIZE) {
      await upsertRows(
        client,
        symbol,
        uniqueRows.slice(index, index + BATCH_SIZE),
      );
    }
    await assertDatabaseContinuity(client, symbol);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  if (deleteSource) {
    await Promise.all(sources.map((source) => fs.unlink(source)));
  }
  console.log(
    JSON.stringify({
      symbol,
      importedCandles: uniqueRows.length,
      deletedSources: deleteSource,
    }),
  );
}

async function readKrakenHourlyCsv(source: string): Promise<CandleRow[]> {
  const rows: CandleRow[] = [];
  const input = createInterface({
    input: createReadStream(source, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  for await (const line of input) {
    lineNumber++;
    if (!line.trim()) continue;
    const fields = line.split(",");
    if (fields.length < 7) {
      throw new Error(`${source}:${lineNumber} is not a Kraken OHLCVT row.`);
    }
    const [epoch, open, high, low, close, volume] = fields;
    const time = new Date(Number(epoch) * 1000);
    const numeric = [open, high, low, close, volume].map(Number);
    if (
      !Number.isFinite(time.getTime()) ||
      numeric.some((value) => !Number.isFinite(value)) ||
      Number(low) > Math.min(Number(open), Number(close)) ||
      Number(high) < Math.max(Number(open), Number(close)) ||
      Number(low) < 0 ||
      Number(volume) < 0
    ) {
      throw new Error(
        `${source}:${lineNumber} contains invalid OHLCVT values.`,
      );
    }
    rows.push({ time, open, high, low, close, volume });
  }
  if (rows.length === 0) throw new Error(`${source} contains no candles.`);
  return rows;
}

function assertContinuous(rows: CandleRow[], label: string) {
  for (let index = 1; index < rows.length; index++) {
    const gap = rows[index].time.getTime() - rows[index - 1].time.getTime();
    if (gap !== HOUR_MS) {
      throw new Error(
        `${label} are not continuous at ${rows[index - 1].time.toISOString()} → ${rows[index].time.toISOString()}.`,
      );
    }
  }
}

async function upsertRows(client: Client, symbol: string, rows: CandleRow[]) {
  const parameters: unknown[] = [];
  const values = rows.map((row, index) => {
    const offset = index * 8;
    parameters.push(
      symbol,
      "1h",
      row.time,
      row.open,
      row.high,
      row.low,
      row.close,
      row.volume,
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
  });
  await client.query(
    `INSERT INTO market_candle (symbol, timeframe, time, open, high, low, close, volume)
     VALUES ${values.join(",")}
     ON CONFLICT (symbol, timeframe, time) DO UPDATE SET
       open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
       close = EXCLUDED.close, volume = EXCLUDED.volume`,
    parameters,
  );
}

async function assertDatabaseContinuity(client: Client, symbol: string) {
  const result = await client.query<{ previous: Date; current: Date }>(
    `SELECT previous_time AS previous, time AS current
       FROM (
         SELECT time, LAG(time) OVER (ORDER BY time) AS previous_time
         FROM market_candle
         WHERE symbol = $1 AND timeframe = '1h'
       ) candles
       WHERE previous_time IS NOT NULL
         AND time - previous_time <> INTERVAL '1 hour'
       LIMIT 1`,
    [symbol],
  );
  const gap = result.rows[0];
  if (gap) {
    throw new Error(
      `Import rolled back: ${symbol} would contain a gap at ${gap.previous.toISOString()} → ${gap.current.toISOString()}.`,
    );
  }
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} must be defined.`);
  return value;
}

void main();
