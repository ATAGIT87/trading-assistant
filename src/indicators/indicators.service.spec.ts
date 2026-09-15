import { IndicatorsService } from "./indicators.service";

describe("IndicatorsService", () => {
  let service: IndicatorsService;

  beforeEach(() => {
    service = new IndicatorsService();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should calculate ATR", () => {
    const result = service.calculateAtr([5, 7, 4], 3);

    expect(result).toBeCloseTo(5.3333, 4);
  });
  it("should calculate true ranges from candles", () => {
    const result = service.calculateTrueRangesFromCandles([
      {
        high: 110,
        low: 105,
        close: 108,
      },
      {
        high: 115,
        low: 107,
        close: 112,
      },
    ]);

    expect(result).toEqual([8]);
  });

  it('should calculate directional movement', () => {
  const result = service.calculateDirectionalMovement(
    115,
    107,
    110,
    105,
  );

  expect(result).toEqual({
    plusDm: 5,
    minusDm: 0,
  });
});

  it('should calculate directional movements from candles', () => {
  const result = service.calculateDirectionalMovements([
    { high: 110, low: 105 },
    { high: 115, low: 107 },
    { high: 113, low: 106 },
  ]);

  expect(result).toEqual({
    plusDm: [5, 0],
    minusDm: [0, 1],
  });
});
it('should calculate directional indicators', () => {
  const result = service.calculateDirectionalIndicators(
    [10, 10],
    [5, 2],
    [0, 3],
    2,
  );

  expect(result).toEqual({
    plusDi: 35,
    minusDi: 15,
  });
});
it('should calculate directional index', () => {
  const result = service.calculateDirectionalIndex(35, 15);

  expect(result).toBe(40);
});
it('should calculate ADX', () => {
  const result = service.calculateAdx(
    [20, 30, 40, 50],
    3,
  );

  expect(result).toBeCloseTo(36.6667, 4);
});
it('should calculate ADX from candles', () => {
  const result = service.calculateAdxFromCandles(
    [
      { high: 110, low: 100, close: 105 },
      { high: 115, low: 102, close: 112 },
      { high: 120, low: 105, close: 118 },
      { high: 125, low: 108, close: 122 },
      { high: 130, low: 110, close: 128 },
      { high: 135, low: 112, close: 132 },
    ],
    3,
  );

  expect(result).not.toBeNull();
});
});
