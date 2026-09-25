import { Test, TestingModule } from "@nestjs/testing";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import { SignalsService } from "./signals.service";
import { StrategyV2Service } from "./strategy-v2.service";

describe("SignalsService", () => {
  let service: SignalsService;
  const marketDataServiceMock = { getHistoricalCandles: jest.fn() };
  const strategyV2ServiceMock = {
    evaluateCandles: jest.fn(),
    getTrend: jest.fn().mockReturnValue("BULLISH"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsService,
        { provide: MARKET_DATA_SERVICE, useValue: marketDataServiceMock },
        { provide: StrategyV2Service, useValue: strategyV2ServiceMock },
      ],
    }).compile();

    service = module.get(SignalsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns null when no historical candles exist", async () => {
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([]);

    await expect(
      service.generateSignalV2("BTCUSD", Timeframe.FIFTEEN_MINUTES, 14),
    ).resolves.toBeNull();
  });

  it("delegates historical signal generation to the strategy", async () => {
    const candles = [{ time: new Date(), close: "100" }];
    const signal = { action: "NO_TRADE" };
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue(candles);
    strategyV2ServiceMock.evaluateCandles.mockReturnValue(signal);

    await expect(
      service.generateSignalV2("BTCUSD", Timeframe.ONE_HOUR, 14),
    ).resolves.toBe(signal);
    expect(strategyV2ServiceMock.evaluateCandles).toHaveBeenCalledWith(
      candles,
      0,
      candles.length,
      undefined,
    );
  });

  it("evaluates only completed candles for a live signal", async () => {
    const now = Date.now();
    const completedCandle = {
      time: new Date(now - 16 * 60 * 1000),
      close: "100",
    };
    const openCandle = {
      time: new Date(now - 2 * 60 * 1000),
      close: "101",
    };
    const signal = { action: "NO_TRADE" };
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([
      completedCandle,
      openCandle,
    ]);
    strategyV2ServiceMock.evaluateCandles.mockReturnValue(signal);

    await expect(
      service.getLiveV2Signal("BTCUSD", Timeframe.FIFTEEN_MINUTES),
    ).resolves.toBe(signal);
    expect(strategyV2ServiceMock.evaluateCandles).toHaveBeenCalledWith(
      [completedCandle],
      0,
      1,
      "BULLISH",
    );
  });

  it("returns a NO_TRADE signal when no candle has closed", async () => {
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([
      { time: new Date(), close: "100" },
    ]);

    const signal = await service.getLiveV2Signal(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
    );

    expect(signal.action).toBe("NO_TRADE");
    expect(strategyV2ServiceMock.evaluateCandles).not.toHaveBeenCalled();
  });
});
