import { Timeframe } from "../assets/enums/timeframe.enum";
import {
  assessMarketDataQuality,
  getLatestContinuousCandleSegment,
} from "./market-data-quality";

const at = (hours: number) => new Date(Date.UTC(2026, 0, 1, hours));
const candle = (hours: number) => ({
  time: at(hours),
  open: "100",
  high: "101",
  low: "99",
  close: "100",
  volume: "10",
});

describe("assessMarketDataQuality", () => {
  it("detects a missing hourly candle", () => {
    const report = assessMarketDataQuality(
      "BTCUSDT",
      Timeframe.ONE_HOUR,
      [candle(0), candle(2)] as any,
      at(4),
    );

    expect(report.gapCount).toBe(1);
    expect(report.largestGapCandles).toBe(1);
    expect(report.isUsableForResearch).toBe(false);
  });

  it("rejects an invalid OHLC range", () => {
    const invalid = { ...candle(0), low: "102" };
    const report = assessMarketDataQuality(
      "BTCUSDT",
      Timeframe.ONE_HOUR,
      [invalid] as any,
      at(2),
    );

    expect(report.invalidOhlcCandles).toBe(1);
  });

  it("returns only the continuous suffix after the most recent gap", () => {
    const segment = getLatestContinuousCandleSegment(
      [candle(0), candle(1), candle(4), candle(5)] as any,
      Timeframe.ONE_HOUR,
    );

    expect(segment.map((entry) => entry.time)).toEqual([at(4), at(5)]);
  });
});
