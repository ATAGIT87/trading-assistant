import { SignalCalculationService } from "./signal-calculation.service";

describe("SignalCalculationService", () => {
  let service: SignalCalculationService;
  let indicatorsServiceMock: any;

  beforeEach(() => {
    indicatorsServiceMock = {
      calculateTrendScore: jest.fn(),
      calculateAverageAlignmentScore: jest.fn(),
      calculateRsiScore: jest.fn(),
      calculateMarketConditionScore: jest.fn(),
      calculateAdxScore: jest.fn(),
    };

    service = new SignalCalculationService(
      indicatorsServiceMock,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return NO_TRADE for a weak setup", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(0);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(0);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(0);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

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
      new Date(),
    );

    expect(signal.confidence).toBe(20);
    expect(signal.isStrongSetup).toBe(false);
    expect(signal.action).toBe("NO_TRADE");
    expect(signal.stopLoss).toBeNull();
    expect(signal.takeProfit).toBeNull();
  });

  it("should return SELL for a strong bearish setup", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

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
      new Date(),
    );

    expect(signal.confidence).toBe(100);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("SELL");
  });

  it("should return BUY for a strong bullish setup", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

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
      new Date(),
    );

    expect(signal.confidence).toBe(100);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("BUY");
  });

  it("should return WAIT for a strong possible reversal", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(0);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

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
      new Date(),
    );

    expect(signal.confidence).toBe(90);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("WAIT");
    expect(signal.stopLoss).toBeNull();
    expect(signal.takeProfit).toBeNull();
  });

  it("should treat confidence 75 as a strong setup", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(20);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(5);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

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
      new Date(),
    );

    expect(signal.confidence).toBe(75);
    expect(signal.isStrongSetup).toBe(true);
    expect(signal.action).toBe("BUY");
  });

  it("should add ADX score to confidence", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

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
      new Date(),
    );

    expect(signal.confidence).toBe(100);
  });

  it("should calculate stop loss for BUY", () => {
    expect(
      service.calculateStopLoss("BUY", 95000, 1107),
    ).toBeCloseTo(93339.5, 4);
  });

  it("should calculate take profit for BUY", () => {
    expect(
      service.calculateTakeProfit(
        "BUY",
        10000,
        9850,
        2,
      ),
    ).toBe(10300);
  });

  it("should calculate take profit for SELL", () => {
    expect(
      service.calculateTakeProfit(
        "SELL",
        10000,
        10150,
        2,
      ),
    ).toBe(9700);
  });

  it("should return NO_TRADE when ADX is weak", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      55,
      20,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return NO_TRADE when confidence is below strong setup threshold", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(0);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(10);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(0);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(0);

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
      new Date(),
    );

    expect(signal.confidence).toBe(50);
    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return WAIT when setup is strong but market condition is neutral", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

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
      new Date(),
    );

    expect(signal.confidence).toBe(100);
    expect(signal.action).toBe("WAIT");
  });

  it("should return NO_TRADE when ATR is too low", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

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
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should not return BUY when trend and market condition disagree", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

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
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should not return SELL when trend and market condition disagree", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

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
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return NO_TRADE when higher timeframe trend disagrees", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      55,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BEARISH",
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return NO_TRADE when higher timeframe trend is neutral", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

    const signal = service.createSignal(
      "BULLISH",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      55,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "NEUTRAL",
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });

  it("should return NO_TRADE when trend is neutral", () => {
    indicatorsServiceMock.calculateTrendScore.mockReturnValue(40);
    indicatorsServiceMock.calculateAverageAlignmentScore.mockReturnValue(30);
    indicatorsServiceMock.calculateRsiScore.mockReturnValue(20);
    indicatorsServiceMock.calculateMarketConditionScore.mockReturnValue(10);
    indicatorsServiceMock.calculateAdxScore.mockReturnValue(5);

    const signal = service.createSignal(
      "NEUTRAL",
      10000,
      1000,
      "ABOVE",
      "ABOVE",
      50,
      30,
      "NEUTRAL",
      "BULLISH_CONTINUATION",
      "BULLISH",
      new Date(),
    );

    expect(signal.action).toBe("NO_TRADE");
  });
});