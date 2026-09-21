import { BacktestTrade } from "../interfaces/backtest-trade.interface";
import { BacktestSummary } from "../interfaces/backtest-result.interface";

export function calculateBacktestSummary(
  trades: BacktestTrade[],
): BacktestSummary {
  const completedTrades = trades.filter(
    (trade) => trade.result === "WIN" || trade.result === "LOSS",
  );

  const winningTrades = completedTrades.filter(
    (trade) => trade.result === "WIN",
  ).length;

  const losingTrades = completedTrades.filter(
    (trade) => trade.result === "LOSS",
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
