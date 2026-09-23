import { DemoTradingService } from "./demo-trading.service";
import { DemoPosition } from "./entities/demo-position.entity";

describe("DemoTradingService", () => {
  const service = new DemoTradingService(
    null as any,
    null as any,
    null as any,
  );

  it("resolves a BUY trade to WIN when take profit is touched and LOSS if stop loss is triggered in the same candle", () => {
    const buyPosition = {
      side: "BUY",
      entry: 100,
      stopLoss: 95,
      takeProfit: 110,
      riskReward: 1,
    } as DemoPosition;

    expect(
      service.resolvePositionOutcome(buyPosition, {
        low: 99,
        high: 110,
      } as any),
    ).toMatchObject({ status: "WIN", exitPrice: 110, resultR: 1 });

    expect(
      service.resolvePositionOutcome(buyPosition, {
        low: 90,
        high: 98,
      } as any),
    ).toMatchObject({ status: "LOSS", exitPrice: 95, resultR: -1 });

    expect(
      service.resolvePositionOutcome(buyPosition, {
        low: 90,
        high: 120,
      } as any),
    ).toMatchObject({ status: "LOSS", exitPrice: 95, resultR: -1 });
  });

  it("resolves a SELL trade to WIN when take profit is reached and LOSS when stop loss is triggered", () => {
    const sellPosition = {
      side: "SELL",
      entry: 100,
      stopLoss: 105,
      takeProfit: 90,
      riskReward: 1,
    } as DemoPosition;

    expect(
      service.resolvePositionOutcome(sellPosition, {
        low: 88,
        high: 102,
      } as any),
    ).toMatchObject({ status: "WIN", exitPrice: 90, resultR: 1 });

    expect(
      service.resolvePositionOutcome(sellPosition, {
        low: 95,
        high: 108,
      } as any),
    ).toMatchObject({ status: "LOSS", exitPrice: 105, resultR: -1 });
  });
});
