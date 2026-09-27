import { MarketCandleStorageService } from "./market-candle-storage.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

describe("MarketCandleStorageService", () => {
  it("replaces a large 4h series in bounded transaction batches", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn(async (callback) =>
      callback({ delete: remove, save }),
    );
    const service = new MarketCandleStorageService({
      manager: { transaction },
    } as any);
    const candles = Array.from({ length: 1001 }, () => ({}));

    await service.replaceFourHourCandles("BTCUSDT", candles as any);

    expect(remove).toHaveBeenCalledWith(expect.anything(), {
      symbol: "BTCUSDT",
      timeframe: Timeframe.FOUR_HOURS,
    });
    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls.map(([, batch]) => batch.length)).toEqual([
      500, 500, 1,
    ]);
  });
});
