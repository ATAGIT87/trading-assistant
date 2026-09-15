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

});