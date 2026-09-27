import { buildBacktestPeriods } from "./backtest-periods.helper";

const candles = [
  new Date("2024-01-01T00:00:00.000Z"),
  new Date("2024-02-01T00:00:00.000Z"),
  new Date("2024-03-01T00:00:00.000Z"),
  new Date("2024-04-01T00:00:00.000Z"),
  new Date("2024-05-01T00:00:00.000Z"),
].map((time) => ({ time })) as never[];

describe("buildBacktestPeriods", () => {
  it("keeps the final holdout out of the research split", () => {
    expect(
      buildBacktestPeriods(candles, new Date("2024-04-01T00:00:00.000Z"), true),
    ).toEqual({
      trainingEndIndex: 1,
      validationEndIndex: 2,
      selectionTestEndIndex: 3,
      protectedHoldoutStartIndex: 3,
    });
  });

  it("uses all available candles when the holdout is excluded", () => {
    expect(
      buildBacktestPeriods(
        candles,
        new Date("2024-04-01T00:00:00.000Z"),
        false,
      ),
    ).toEqual({
      trainingEndIndex: 3,
      validationEndIndex: 4,
      selectionTestEndIndex: 5,
      protectedHoldoutStartIndex: null,
    });
  });
});
