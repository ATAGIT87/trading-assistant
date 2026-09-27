import { applyPortfolioCapacity } from "./portfolio-capacity.helper";

const trade = (symbol: string, entryHour: number, exitHour: number) =>
  ({
    symbol,
    segment: "test",
    time: new Date(Date.UTC(2020, 0, 1, entryHour)),
    exitTime: new Date(Date.UTC(2020, 0, 1, exitHour)),
    action: "BUY",
    result: "WIN",
    resultR: 1,
  }) as any;

describe("applyPortfolioCapacity", () => {
  it("keeps only non-overlapping trades when Demo capacity is one", () => {
    const accepted = applyPortfolioCapacity(
      [trade("BTC", 1, 4), trade("ETH", 2, 3), trade("SOL", 5, 6)],
      1,
    );
    expect(accepted.map((item) => item.time.getUTCHours())).toEqual([1, 5]);
  });

  it("accepts persisted ISO timestamps returned from the JSON backtest column", () => {
    const persisted = [trade("BTC", 1, 4), trade("ETH", 2, 3)].map((item) => ({
      ...item,
      time: item.time.toISOString(),
      exitTime: item.exitTime.toISOString(),
    }));
    expect(applyPortfolioCapacity(persisted as any, 1)).toHaveLength(1);
  });
});
