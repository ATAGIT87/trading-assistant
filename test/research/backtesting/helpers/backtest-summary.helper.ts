import { StrategyEvidenceTrade } from "../../../../src/production/strategy-approval/evidence-trade";
import { StrategyEvidenceSummary } from "../../../../src/production/strategy-approval/evidence-result";

export function calculateBacktestSummary(
  trades: StrategyEvidenceTrade[],
): StrategyEvidenceSummary {
  const completedTrades = trades.filter((trade) => trade.resultR !== null);

  const winningTrades = completedTrades.filter(
    (trade) => trade.resultR! > 0,
  ).length;

  const losingTrades = completedTrades.filter(
    (trade) => trade.resultR! < 0,
  ).length;

  const totalR = completedTrades.reduce(
    (sum, trade) => sum + (trade.resultR ?? 0),
    0,
  );

  return {
    totalTrades: completedTrades.length,

    winningTrades,

    losingTrades,

    winRate:
      completedTrades.length === 0
        ? 0
        : (winningTrades / completedTrades.length) * 100,

    totalR,

    expectancyR:
      completedTrades.length === 0 ? 0 : totalR / completedTrades.length,
  };
}
