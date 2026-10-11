import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";

/** Official Kraken 1h/4h/1d CSV: timestamp seconds,open,high,low,close,volume,trades.
 * Does not invent candles for intervals without trades or silently overwrite conflicts.
 */
export async function readKrakenCsv(
  source: string,
  symbol: string,
  timeframe: Timeframe = Timeframe.ONE_HOUR,
): Promise<MarketCandle[]> {
  const duration = { "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 }[
    timeframe
  ];
  if (!duration) throw new Error("UNSUPPORTED_SOURCE_TIMEFRAME");
  const input = createInterface({
    input: createReadStream(source, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  const rows = new Map<number, MarketCandle>();
  let lineNumber = 0;
  for await (const line of input) {
    lineNumber++;
    if (!line.trim()) continue;
    const fields = line.trim().split(",");
    if (fields.length !== 7 || fields.some((f) => !f.trim()))
      throw new Error(`${source}:${lineNumber}: invalid Kraken OHLCVT row.`);
    const [epoch, open, high, low, close, volume, trades] = fields;
    const timestamp = Number(epoch) * 1000;
    const values = [open, high, low, close, volume, trades].map(Number);
    if (
      !Number.isSafeInteger(timestamp) ||
      timestamp <= 0 ||
      timestamp % duration !== 0 ||
      !values.every(Number.isFinite) ||
      Math.min(...values.slice(0, 4)) <= 0 ||
      Number(low) > Math.min(Number(open), Number(close)) ||
      Number(high) < Math.max(Number(open), Number(close)) ||
      Number(volume) < 0 ||
      !Number.isSafeInteger(Number(trades)) ||
      Number(trades) < 0
    )
      throw new Error(
        `${source}:${lineNumber}: invalid timeframe timestamp or OHLCVT values.`,
      );
    const candle = {
      symbol,
      timeframe,
      time: new Date(timestamp),
      open,
      high,
      low,
      close,
      volume,
    } as MarketCandle;
    const existing = rows.get(timestamp);
    if (
      existing &&
      ["open", "high", "low", "close", "volume"].some(
        (k) =>
          Number(existing[k as keyof MarketCandle]) !==
          Number(candle[k as keyof MarketCandle]),
      )
    )
      throw new Error(`${source}:${lineNumber}: conflicting duplicate candle.`);
    rows.set(timestamp, candle);
  }
  if (!rows.size) throw new Error(`${source}: no candles.`);
  return [...rows.values()].sort((a, b) => +a.time - +b.time);
}
