import { SignalsService } from "./signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

describe("SignalsService", () => {
  let service: SignalsService;
  let indicatorsServiceMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const marketDataServiceMock = {
      getLatestAdx: jest.fn().mockResolvedValue(30),
      getTrend: jest.fn(),
    };
    indicatorsServiceMock = {
      calculateTrendScore: jest.fn().mockReturnValue(0),
      calculateAverageAlignmentScore: jest.fn().mockReturnValue(0),
      calculateRsiScore: jest.fn().mockReturnValue(20),
      calculateMarketConditionScore: jest.fn().mockReturnValue(0),
      calculateAdxScore: jest.fn().mockReturnValue(0),
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
      "BEARISH",
      10000,
      1000,
      "BELOW",
      "BELOW",
      50,
      30,
      "NEUTRAL",
      "BEARISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.confidence).toBe(20);
    expect(signal.isStrongSetup).toBe(false);
    expect(signal.action).toBe("NO_TRADE");
    expect(signal.stopLoss).toBeNull();
    expect(signal.takeProfit).toBeNull();
  });

  it("should return SELL for a strong bearish setup", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);

    const signal = service.createSignal(
      "BEARISH",
      10000,
      1000,
      "BELOW",
      "BELOW",
      50,
      30,
      "NEUTRAL",
      "BEARISH_CONTINUATION",
      "BEARISH",
    );

    expect(signal.confidence).toBe(100);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("SELL");
  });

  it("should return BUY for a strong bullish setup", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      50,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.confidence).toBe(100);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("BUY");
  });

  it("should return WAIT for a strong possible reversal", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      50,
      30,
      "NEUTRAL",
      "POSSIBLE_REVERSAL",
      "BULLISH",
    );

    expect(signal.confidence).toBe(90);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("WAIT");
    expect(signal.stopLoss).toBeNull();
    expect(signal.takeProfit).toBeNull();
  });

  it("should treat confidence 75 as a strong setup", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );

    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(20);

    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(5);

    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "EQUAL",
      50,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.confidence).toBe(75);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("BUY");
  });
  it("should add ADX score to confidence", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(5);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      50,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.confidence).toBe(100);
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
      getLatestAdx: jest.fn().mockResolvedValue(30)
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
    const result = service.calculateStopLoss("BUY", 95000, 1107);

    expect(result).toBeCloseTo(93339.5, 4);
  });
  it("should calculate take profit for BUY", () => {
    const result = service.calculateTakeProfit("BUY", 10000, 9850, 2);

    expect(result).toBe(10300);
  });
  it("should calculate take profit for SELL", () => {
    const result = service.calculateTakeProfit("SELL", 10000, 10150, 2);

    expect(result).toBe(9700);
  });

  it("should return NO_TRADE when ADX is weak", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(0);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      50,
      20,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return NO_TRADE when confidence is below strong setup threshold", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(0);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(10);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(0);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(0);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "BELOW",
      40,
      20,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.confidence).toBe(50);
    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return WAIT when setup is strong but market condition is neutral", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(5);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      55,
      30,
      "NEUTRAL",
      "NEUTRAL",
      "BULLISH",
    );

    expect(signal.confidence).toBe(100);
    expect(signal.action).toBe("WAIT");
  });
  it("should return NO_TRADE when ATR is too low", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(5);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      0,
      "ABOVE",
      "ABOVE",
      55,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.action).toBe("NO_TRADE");
  });
  it("should not return BUY when trend and market condition disagree", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(5);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      55,
      30,
      "NEUTRAL",
      "BEARISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.action).toBe("NO_TRADE");
  });
  it("should not return SELL when trend and market condition disagree", () => {
    (indicatorsServiceMock.calculateTrendScore as jest.Mock).mockReturnValue(
      40,
    );
    (
      indicatorsServiceMock.calculateAverageAlignmentScore as jest.Mock
    ).mockReturnValue(30);
    (indicatorsServiceMock.calculateRsiScore as jest.Mock).mockReturnValue(20);
    (
      indicatorsServiceMock.calculateMarketConditionScore as jest.Mock
    ).mockReturnValue(10);
    (indicatorsServiceMock.calculateAdxScore as jest.Mock).mockReturnValue(5);

    const signal = service.createSignal(
      "BEARISH",
      10000,
      1000,
      "BELOW",
      "BELOW",
      45,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should get the trend from the higher timeframe", async () => {
  const marketDataServiceMock = service["marketDataService"] as any;

  marketDataServiceMock.getTrend.mockResolvedValue("BULLISH");

  const trend = await service.getHigherTimeframeTrend(
    "BTCUSD",
    Timeframe.ONE_HOUR,
    14,
  );

  expect(trend).toBe("BULLISH");

  expect(marketDataServiceMock.getTrend).toHaveBeenCalledWith(
    "BTCUSD",
    Timeframe.FOUR_HOURS,
    14,
  );
});


});
