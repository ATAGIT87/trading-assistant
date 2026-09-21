import { StrategyV2Service } from "./strategy-v2.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { Timeframe } from "../assets/enums/timeframe.enum";

const makeCandle = (
  time: string,
  open: number,
  high: number,
  low: number,
  close: number,
): MarketCandle => ({
  id: 1,
  symbol: "BTCUSD",
  timeframe: Timeframe.FIFTEEN_MINUTES,
  time: new Date(time),
  open: open.toString(),
  high: high.toString(),
  low: low.toString(),
  close: close.toString(),
  volume: "1",
});

describe("StrategyV2Service", () => {
  let service: StrategyV2Service;

  beforeEach(() => {
    service = new StrategyV2Service();
  });

  it("should not generate a signal on the breakout candle itself", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 100, 101, 99, 100),
      makeCandle("2024-01-01T00:15:00.000Z", 100, 101, 99, 100),
      makeCandle("2024-01-01T00:30:00.000Z", 100, 102, 99.5, 101.8),
    ];

    const signal = service.evaluateCandles(candles, 0, 3);

    expect(signal.action).toBe("WAIT");
    expect(signal.reason).toContain("pending breakout");
  });

  it("should convert a valid rejection into a BUY after the breakout", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 100, 100.5, 99.2, 99.8),
      makeCandle("2024-01-01T00:15:00.000Z", 99.8, 100.4, 99.4, 100.2),
      makeCandle("2024-01-01T00:30:00.000Z", 100.2, 101.6, 100.0, 101.1),
      makeCandle("2024-01-01T00:45:00.000Z", 101.1, 101.5, 100.8, 101.0),
      makeCandle("2024-01-01T01:00:00.000Z", 101.0, 101.2, 100.6, 100.9),
    ];

    const signal = service.evaluateCandles(candles, 0, 5);

    expect(signal.action).toBe("BUY");
    expect(signal.entryPrice).toBeGreaterThan(100);
    expect(signal.candleTime).toEqual(new Date("2024-01-01T00:45:00.000Z"));
  });

  it("should expire a pending breakout when no valid rejection appears within 3 candles", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 100, 100.5, 99.2, 99.8),
      makeCandle("2024-01-01T00:15:00.000Z", 99.8, 100.4, 99.4, 100.2),
      makeCandle("2024-01-01T00:30:00.000Z", 100.2, 101.6, 100.0, 101.1),
      makeCandle("2024-01-01T00:45:00.000Z", 101.1, 101.4, 101.0, 101.3),
      makeCandle("2024-01-01T01:00:00.000Z", 101.3, 101.5, 101.2, 101.4),
      makeCandle("2024-01-01T01:15:00.000Z", 101.4, 101.7, 101.1, 101.5),
      makeCandle("2024-01-01T01:30:00.000Z", 101.5, 101.8, 101.4, 101.6),
    ];

    const signal = service.evaluateCandles(candles, 0, 7);

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reason).toContain("expired");
  });

  it("should respect the higher timeframe direction when determining V2 setup eligibility", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 100, 100.4, 99.3, 99.8),
      makeCandle("2024-01-01T00:15:00.000Z", 99.8, 100.5, 99.4, 100.3),
      makeCandle("2024-01-01T00:30:00.000Z", 100.3, 101.2, 100.0, 101.1),
      makeCandle("2024-01-01T00:45:00.000Z", 101.1, 101.9, 100.9, 101.7),
      makeCandle("2024-01-01T01:00:00.000Z", 101.7, 102.1, 101.3, 101.8),
    ];

    const signal = service.evaluateCandles(candles, 0, 5, "BEARISH");

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reason).toContain("Higher timeframe");
  });
});
