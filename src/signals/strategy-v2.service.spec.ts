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

  it("should return WAIT when the latest candle is the breakout candle itself", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 99.17180787630059, 104.85222770229302, 89.0819814625811, 90.5424395062746),
      makeCandle("2024-01-01T00:15:00.000Z", 84.24610805806333, 94.40501697486434, 80.99739683876578, 87.69726997733778),
      makeCandle("2024-01-01T00:30:00.000Z", 88.39432396439543, 95.6577051693489, 80.222439011613, 91.16719191705806),
      makeCandle("2024-01-01T00:45:00.000Z", 94.749304532535, 96.96197138985326, 85.09474090384992, 89.4139808349546),
      makeCandle("2024-01-01T01:00:00.000Z", 86.7752921051515, 94.27023382037851, 80.2294466735375, 84.84601669576932),
      makeCandle("2024-01-01T01:15:00.000Z", 76.5041122860157, 79.08259323315451, 64.31751188962335, 68.99639831723744),
      makeCandle("2024-01-01T01:30:00.000Z", 61.93121437200443, 64.47533369311623, 50.618364120548904, 55.491803645639266),
      makeCandle("2024-01-01T01:45:00.000Z", 64.61765348147583, 65.92331929168267, 55.18448817134686, 63.64059828020163),
      makeCandle("2024-01-01T02:00:00.000Z", 60.830680462388955, 66.12333251698601, 57.18813619989214, 61.83115927363269),
      makeCandle("2024-01-01T02:15:00.000Z", 53.24995355906958, 55.08705469215147, 49.336898824848504, 50.813779117089325),
      makeCandle("2024-01-01T02:30:00.000Z", 47.77484235018255, 58.16302253563026, 46.40935365279347, 52.69274105491331),
      makeCandle("2024-01-01T02:45:00.000Z", 44.840773565417294, 55.66744966862734, 40.69005979889971, 47.465406049554986),
    ];

    const signal = service.evaluateCandles(candles, 0, candles.length);

    expect(signal.action).toBe("WAIT");
    expect(signal.reason).toContain("BREAKOUT_CANDLE_WAIT");
    expect(signal.reason).toContain("breakout candle itself");
  });

  it("should return NO_TRADE when there is no valid confirmed swing breakout", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 100, 101, 99, 100),
      makeCandle("2024-01-01T00:15:00.000Z", 100, 101, 99, 100),
      makeCandle("2024-01-01T00:30:00.000Z", 100, 102, 99.5, 101.8),
      makeCandle("2024-01-01T00:45:00.000Z", 101.8, 103, 101, 102.6),
      makeCandle("2024-01-01T01:00:00.000Z", 102.6, 103.5, 102.1, 103.2),
      makeCandle("2024-01-01T01:15:00.000Z", 103.2, 104.2, 103.0, 104.1),
    ];

    const signal = service.evaluateCandles(candles, 0, candles.length);

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reason).toContain("NO_CONFIRMED_SWING_BREAKOUT");
    expect(signal.reason).toContain("confirmed swing high exists");
  });

  it("should keep a pending breakout unresolved until a valid rejection appears", () => {
    const candles = [
      makeCandle("2024-01-01T00:00:00.000Z", 127, 136.5, 124.5, 134),
      makeCandle("2024-01-01T00:15:00.000Z", 130, 136.5, 120.5, 126),
      makeCandle("2024-01-01T00:30:00.000Z", 123, 128.5, 114.5, 119),
      makeCandle("2024-01-01T00:45:00.000Z", 123, 135.5, 115.5, 129),
      makeCandle("2024-01-01T01:00:00.000Z", 127, 132.5, 114.5, 118),
      makeCandle("2024-01-01T01:15:00.000Z", 116, 123.5, 106.5, 108),
      makeCandle("2024-01-01T01:30:00.000Z", 103, 113.5, 102.5, 109),
      makeCandle("2024-01-01T01:45:00.000Z", 107, 111.5, 97.5, 101),
      makeCandle("2024-01-01T02:00:00.000Z", 105, 110.5, 98.5, 101),
      makeCandle("2024-01-01T02:15:00.000Z", 99, 102.5, 89.5, 93),
      makeCandle("2024-01-01T02:30:00.000Z", 91, 96.5, 88.5, 93),
      makeCandle("2024-01-01T02:45:00.000Z", 92, 94.5, 82.5, 86),
    ];

    const signal = service.evaluateCandles(candles, 0, candles.length);

    expect(signal.action).toBe("WAIT");
    expect(signal.reason).toContain("BREAKOUT_CONFIRMATION_PENDING");
    expect(signal.reason).toContain("within the 3-candle confirmation window");
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
    expect(signal.reason).toContain("HIGHER_TIMEFRAME_CONFLICT");
    expect(signal.reason).toContain("HTF trend BEARISH");
  });
});
