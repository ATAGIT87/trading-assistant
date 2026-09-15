import { SignalsService } from "./signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

describe("SignalsService", () => {
  let service: SignalsService;
  let indicatorsServiceMock: any;

  beforeEach(() => {
    const marketDataServiceMock = {};
    indicatorsServiceMock = {
  calculateTrendScore: jest.fn().mockReturnValue(0),
  calculateAverageAlignmentScore: jest.fn().mockReturnValue(0),
  calculateRsiScore: jest.fn().mockReturnValue(20),
};

    service = new SignalsService(
      marketDataServiceMock as any,
      indicatorsServiceMock as any,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return NO_TRADE for a weak setup", () => {
  const signal = service.createSignal(
    "NEUTRAL",
    10000,
    "ABOVE",
    "BELOW",
    50,
    "NEUTRAL",
    "NEUTRAL",
  );

  expect(signal.confidence).toBe(20);
  expect(signal.isStrongSetup).toBe(false);
  expect(signal.action).toBe("NO_TRADE");
});

it("should return SELL for a strong bearish setup", () => {
  (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(40);
(indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock).mockReturnValue(40);
(indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
  const signal = service.createSignal(
    "BEARISH",
    10000,
    1000,
    "BELOW",
    "BELOW",
    50,
    "NEUTRAL",
    "BEARISH_CONTINUATION",
  );

  expect(signal.confidence).toBe(100);
  expect(signal.isStrongSetup).toBe(true);
  expect(signal.action).toBe("SELL");
});
it("should return BUY for a strong bullish setup", () => {
  (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(40);
  (indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock).mockReturnValue(40);
  (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);

  const signal = service.createSignal(
    "BULLISH",
    10000,
    1000,
    "ABOVE",
    "ABOVE",
    50,
    "NEUTRAL",
    "BULLISH_CONTINUATION",
  );

  expect(signal.confidence).toBe(100);
  expect(signal.isStrongSetup).toBe(true);
  expect(signal.action).toBe("BUY");
});
it("should return WAIT for a strong possible reversal", () => {
  (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(40);
  (indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock).mockReturnValue(40);
  (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);

  const signal = service.createSignal(
    "BULLISH",
    10000,
    1000,
    "ABOVE",
    "ABOVE",
    50,
    "NEUTRAL",
    "POSSIBLE_REVERSAL",
  );

  expect(signal.confidence).toBe(100);
  expect(signal.isStrongSetup).toBe(true);
  expect(signal.action).toBe("WAIT");
});
it("should treat confidence 75 as a strong setup", () => {
  (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(40);
  (indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock).mockReturnValue(20);
  (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(15);

  const signal = service.createSignal(
    "BULLISH",
    10000,
    1000,
    "ABOVE",
    "EQUAL",
    50,
    "NEUTRAL",
    "BULLISH_CONTINUATION",
  );

  expect(signal.confidence).toBe(75);
  expect(signal.isStrongSetup).toBe(true);
  expect(signal.action).toBe("BUY");
});

it("should include the latest price as entry price", async () => {
  const marketDataServiceMock = {
    getTrend: jest.fn().mockResolvedValue("BULLISH"),
    compareLatestPriceToSma: jest.fn().mockResolvedValue("ABOVE"),
    compareLatestPriceToEma: jest.fn().mockResolvedValue("ABOVE"),
    getLatestRsi: jest.fn().mockResolvedValue(50),
    getRsiStatus: jest.fn().mockResolvedValue("NEUTRAL"),
    getMarketCondition: jest.fn().mockResolvedValue("BULLISH_CONTINUATION"),
    getLatestPrice: jest.fn().mockResolvedValue(100000),
    getLatestAtr: jest.fn().mockResolvedValue(1000),
  };

  service = new SignalsService(
    marketDataServiceMock as any,
    indicatorsServiceMock as any,
  );

  const signal = await service.generateSignal(
    "BTCUSD",
    Timeframe.ONE_HOUR,
    14,
  );

  expect(signal?.entryPrice).toBe(100000);
});

it("should calculate stop loss for BUY", () => {
  const result = service.calculateStopLoss(
    "BUY",
    95000,
    1107,
  );

  expect(result).toBeCloseTo(93339.5, 4);
});

});