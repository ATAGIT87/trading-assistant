import { buildWalkForwardWindows } from "./walk-forward.helper";

describe("buildWalkForwardWindows", () => {
  it("creates chronological, non-overlapping forward windows after warm-up", () => {
    expect(buildWalkForwardWindows(110, 20, 3)).toEqual([
      { index: 1, startIndex: 20, endIndex: 50 },
      { index: 2, startIndex: 50, endIndex: 80 },
      { index: 3, startIndex: 80, endIndex: 110 },
    ]);
  });
});
