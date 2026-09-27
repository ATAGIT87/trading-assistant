import { Test, TestingModule } from "@nestjs/testing";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import { SignalsService } from "./signals.service";
import { StrategyRegistryService } from "./strategy-registry.service";

describe("SignalsService", () => {
  let service: SignalsService;
  const marketDataServiceMock = { getHistoricalCandles: jest.fn() };
  const strategyV2ServiceMock = {
    version: "test-strategy",
    supportedTimeframes: Object.values(Timeframe),
    requiresHigherTimeframeConfirmation: true,
    maxHoldingCandles: 48,
    evaluateCandles: jest.fn(),
    getTrend: jest.fn().mockReturnValue("BULLISH"),
  };
  const strategyRegistryMock = {
    getActive: jest.fn(() => strategyV2ServiceMock),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsService,
        { provide: MARKET_DATA_SERVICE, useValue: marketDataServiceMock },
        { provide: StrategyRegistryService, useValue: strategyRegistryMock },
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
      service.generateSignalV2("BTCUSDT", Timeframe.FIFTEEN_MINUTES, 14),
    ).resolves.toBeNull();
  });

  it("delegates historical signal generation to the strategy", async () => {
    const candles = [{ time: new Date(), close: "100" }];
    const signal = { action: "NO_TRADE" };
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue(candles);
    strategyV2ServiceMock.evaluateCandles.mockReturnValue(signal);

    await expect(
      service.generateSignalV2("BTCUSDT", Timeframe.ONE_HOUR, 14),
    ).resolves.toBe(signal);
    expect(strategyV2ServiceMock.evaluateCandles).toHaveBeenCalledWith(
      candles,
      0,
      candles.length,
      undefined,
      "BTCUSDT",
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
      service.getLiveV2Signal("BTCUSDT", Timeframe.FIFTEEN_MINUTES),
    ).resolves.toBe(signal);
    expect(strategyV2ServiceMock.evaluateCandles).toHaveBeenCalledWith(
      [completedCandle],
      0,
      1,
      "BULLISH",
      "BTCUSDT",
    );
  });

  it("does not expose a short-entry signal in Spot mode", async () => {
    const now = Date.now();
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([
      { time: new Date(now - 16 * 60 * 1000), close: "100" },
    ]);
    strategyV2ServiceMock.evaluateCandles.mockReturnValue({
      action: "SELL",
      stopLoss: 110,
      takeProfit: 90,
      isStrongSetup: true,
      reason: "bearish setup",
    });

    await expect(
      service.getLiveV2Signal("BTCUSDT", Timeframe.FIFTEEN_MINUTES),
    ).resolves.toMatchObject({
      action: "NO_TRADE",
      stopLoss: null,
      takeProfit: null,
    });
  });

  it("returns a NO_TRADE signal when no candle has closed", async () => {
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([
      { time: new Date(), close: "100" },
    ]);

    const signal = await service.getLiveV2Signal(
      "BTCUSDT",
      Timeframe.FIFTEEN_MINUTES,
    );

    expect(signal.action).toBe("NO_TRADE");
    expect(strategyV2ServiceMock.evaluateCandles).not.toHaveBeenCalled();
  });
});
