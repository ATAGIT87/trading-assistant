import { Test, TestingModule } from "@nestjs/testing";

import { SignalsService } from "./signals.service";
import { MARKET_DATA_SERVICE } from "./market-data.token";
import { IndicatorsService } from "../indicators/indicators.service";
import { SignalStorageService } from "./signal-storage.service";
import { SignalCalculationService } from "./signal-calculation.service";
import { SignalTimeframeService } from "./signal-timeframe.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

describe("SignalsService", () => {
  let service: SignalsService;

  const marketDataServiceMock = {
    getTrend: jest.fn(),
    compareLatestPriceToSma: jest.fn(),
    compareLatestPriceToEma: jest.fn(),
    getLatestRsi: jest.fn(),
    getRsiStatus: jest.fn(),
    getMarketCondition: jest.fn(),
    getLatestPrice: jest.fn(),
    getLatestAtr: jest.fn(),
    getLatestAdx: jest.fn(),
    getHistoricalCandles: jest.fn(),
  };

  const indicatorsServiceMock = {
    calculateIndicatorsFromCandles: jest.fn(),
  };

  const signalStorageServiceMock = {
    getSignalByCandleTime: jest.fn(),
    saveSignal: jest.fn(),
  };

  const signalCalculationServiceMock = {
    createSignal: jest.fn(),
  };

  const signalTimeframeServiceMock = {
    getHigherTimeframeTrend: jest.fn(),
    getHigherTimeframeTrendFromCandles: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsService,
        {
          provide: MARKET_DATA_SERVICE,
          useValue: marketDataServiceMock,
        },
        {
          provide: IndicatorsService,
          useValue: indicatorsServiceMock,
        },
        {
          provide: SignalStorageService,
          useValue: signalStorageServiceMock,
        },
        {
          provide: SignalCalculationService,
          useValue: signalCalculationServiceMock,
        },
        {
          provide: SignalTimeframeService,
          useValue: signalTimeframeServiceMock,
        },
      ],
    }).compile();

    service = module.get<SignalsService>(SignalsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return null when there are no candles", async () => {
    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([]);

    const result = await service.generateSignal(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
      14,
    );

    expect(result).toBeNull();
  });

  it("should return generated signal", async () => {
    const candle = {
      time: new Date("2026-01-01T00:00:00Z"),
      close: "100",
    };

    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([candle]);
    marketDataServiceMock.getTrend.mockResolvedValue("BULLISH");
    marketDataServiceMock.compareLatestPriceToSma.mockResolvedValue("ABOVE");
    marketDataServiceMock.compareLatestPriceToEma.mockResolvedValue("ABOVE");
    marketDataServiceMock.getLatestRsi.mockResolvedValue(55);
    marketDataServiceMock.getRsiStatus.mockResolvedValue("NEUTRAL");
    marketDataServiceMock.getMarketCondition.mockResolvedValue(
      "BULLISH_CONTINUATION",
    );
    marketDataServiceMock.getLatestPrice.mockResolvedValue(100);
    marketDataServiceMock.getLatestAtr.mockResolvedValue(2);
    marketDataServiceMock.getLatestAdx.mockResolvedValue(30);

    signalTimeframeServiceMock.getHigherTimeframeTrend.mockResolvedValue(
      "BULLISH",
    );

    signalStorageServiceMock.getSignalByCandleTime.mockResolvedValue(null);

    const signal = {
      action: "BUY",
      confidence: 90,
      entryPrice: 100,
    };

    signalCalculationServiceMock.createSignal.mockReturnValue(signal);

    const result = await service.generateSignal(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
      14,
    );

    expect(result).toBe(signal);
    expect(signalCalculationServiceMock.createSignal).toHaveBeenCalled();
    expect(signalStorageServiceMock.saveSignal).toHaveBeenCalledWith(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
      signal,
    );
  });

  it("should not save an existing signal", async () => {
    const candle = {
      time: new Date("2026-01-01T00:00:00Z"),
      close: "100",
    };

    marketDataServiceMock.getHistoricalCandles.mockResolvedValue([candle]);
    marketDataServiceMock.getTrend.mockResolvedValue("BULLISH");
    marketDataServiceMock.compareLatestPriceToSma.mockResolvedValue("ABOVE");
    marketDataServiceMock.compareLatestPriceToEma.mockResolvedValue("ABOVE");
    marketDataServiceMock.getLatestRsi.mockResolvedValue(55);
    marketDataServiceMock.getRsiStatus.mockResolvedValue("NEUTRAL");
    marketDataServiceMock.getMarketCondition.mockResolvedValue(
      "BULLISH_CONTINUATION",
    );
    marketDataServiceMock.getLatestPrice.mockResolvedValue(100);
    marketDataServiceMock.getLatestAtr.mockResolvedValue(2);
    marketDataServiceMock.getLatestAdx.mockResolvedValue(30);

    signalTimeframeServiceMock.getHigherTimeframeTrend.mockResolvedValue(
      "BULLISH",
    );

    const existingSignal = {
      action: "BUY",
      confidence: 90,
    };

    signalStorageServiceMock.getSignalByCandleTime.mockResolvedValue(
      existingSignal,
    );

    signalCalculationServiceMock.createSignal.mockReturnValue(existingSignal);

    const result = await service.generateSignal(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
      14,
    );

    expect(result).toBe(existingSignal);
    expect(signalStorageServiceMock.saveSignal).not.toHaveBeenCalled();
  });

  it("should delegate getSignalByCandleTime", async () => {
    const candleTime = new Date("2026-01-01T00:00:00Z");
    const signal = { action: "BUY" };

    signalStorageServiceMock.getSignalByCandleTime.mockResolvedValue(signal);

    const result = await service.getSignalByCandleTime(
      "BTCUSD",
      Timeframe.ONE_HOUR,
      candleTime,
    );

    expect(result).toBe(signal);
    expect(signalStorageServiceMock.getSignalByCandleTime).toHaveBeenCalledWith(
      "BTCUSD",
      Timeframe.ONE_HOUR,
      candleTime,
    );
  });

  it("should generate signal from candles", async () => {
    const candles = [
      {
        time: new Date("2026-01-01T00:00:00Z"),
        close: "100",
      },
    ];

    const indicators = {
      trend: "BULLISH",
      priceVsSma: "ABOVE",
      priceVsEma: "ABOVE",
      rsi: 55,
      rsiStatus: "NEUTRAL",
      marketCondition: "BULLISH_CONTINUATION",
      atr: 2,
      adx: 30,
    };

    const signal = {
      action: "BUY",
      confidence: 90,
    };

    indicatorsServiceMock.calculateIndicatorsFromCandles.mockReturnValue(
      indicators,
    );

    signalTimeframeServiceMock.getHigherTimeframeTrendFromCandles.mockResolvedValue(
      "BULLISH",
    );

    signalCalculationServiceMock.createSignal.mockReturnValue(signal);

    const result = await service.generateSignalFromCandles(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
      candles as any,
    );

    expect(result).toBe(signal);
    expect(signalCalculationServiceMock.createSignal).toHaveBeenCalled();
  });

  it("should return null when indicators cannot be calculated", async () => {
    indicatorsServiceMock.calculateIndicatorsFromCandles.mockReturnValue(null);

    const result = await service.generateSignalFromCandles(
      "BTCUSD",
      Timeframe.FIFTEEN_MINUTES,
      [],
    );

    expect(result).toBeNull();
  });
});
