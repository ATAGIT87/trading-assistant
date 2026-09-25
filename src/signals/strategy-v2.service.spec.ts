import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { RiskManagerService } from "../risk/risk-manager.service";
import { StrategyV2Service } from "./strategy-v2.service";

const makeCandle = (index: number, close: number): MarketCandle => ({
  id: index,
  symbol: "BTCUSD",
  timeframe: Timeframe.FIFTEEN_MINUTES,
  time: new Date(Date.UTC(2026, 0, 1, 0, index * 15)),
  open: (close - 0.5).toString(),
  high: (close + 1).toString(),
  low: (close - 1).toString(),
  close: close.toString(),
  volume: "1",
});

describe("StrategyV2Service", () => {
  const service = new StrategyV2Service(
    new IndicatorsService(),
    new RiskManagerService(),
  );

  it("returns NO_TRADE when there are no completed candles", () => {
    const signal = service.evaluateCandles([]);

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reason).toContain("No completed candles");
  });

  it("requires fifty candles for the baseline strategy", () => {
    const signal = service.evaluateCandles(
      Array.from({ length: 49 }, (_, index) => makeCandle(index, 100 + index)),
    );

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reason).toContain("Not enough completed candles");
  });

  it("produces a BUY signal for an established bullish breakout", () => {
    const candles = Array.from(
      { length: 50 },
      (_, index) => makeCandle(index, 100 + index),
    );
    candles[49] = makeCandle(49, 151);

    const signal = service.evaluateCandles(candles);

    expect(signal.action).toBe("BUY");
    expect(signal.stopLoss).not.toBeNull();
    expect(signal.takeProfit).not.toBeNull();
    expect(signal.candleTime).toEqual(candles[49].time);
  });

  it("rejects a trade when the higher timeframe trend conflicts", () => {
    const candles = Array.from(
      { length: 50 },
      (_, index) => makeCandle(index, 100 + index),
    );

    const signal = service.evaluateCandles(
      candles,
      0,
      candles.length,
      "BEARISH",
    );

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reason).toContain("higher timeframe confirmation failed");
  });
});
