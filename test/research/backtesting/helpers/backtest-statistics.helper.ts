import { StrategyEvidenceTrade } from "../../../../src/production/strategy-approval/evidence-trade";

/** Statistics for Spot long entries only. */
export interface BacktestStatistics {
  entryTrades: number;
  entryWins: number;
  entryLosses: number;
  entryTotalR: number;
  winAverageRsi: number;
  lossAverageRsi: number;
  winAverageAdx: number;
  lossAverageAdx: number;
  winAverageMaeR: number;
  winAverageMfeR: number;
  winAverageDurationCandles: number;
  lossAverageMaeR: number;
  lossAverageMfeR: number;
  lossAverageDurationCandles: number;
  lossMfeAtLeast1R: number;
  lossMfeAtLeast2R: number;
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateBacktestStatistics(
  trades: StrategyEvidenceTrade[],
): BacktestStatistics {
  const entries = trades.filter((trade) => trade.action === "BUY");
  const wins = entries.filter(
    (trade) => trade.resultR !== null && trade.resultR > 0,
  );
  const losses = entries.filter(
    (trade) => trade.resultR !== null && trade.resultR < 0,
  );

  return {
    entryTrades: entries.length,
    entryWins: wins.length,
    entryLosses: losses.length,
    entryTotalR: entries.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0),
    winAverageRsi: average(wins.map((trade) => trade.rsi)),
    lossAverageRsi: average(losses.map((trade) => trade.rsi)),
    winAverageAdx: average(wins.map((trade) => trade.adx)),
    lossAverageAdx: average(losses.map((trade) => trade.adx)),
    winAverageMaeR: average(wins.map((trade) => trade.maeR)),
    winAverageMfeR: average(wins.map((trade) => trade.mfeR)),
    winAverageDurationCandles: average(
      wins.map((trade) => trade.durationCandles),
    ),
    lossAverageMaeR: average(losses.map((trade) => trade.maeR)),
    lossAverageMfeR: average(losses.map((trade) => trade.mfeR)),
    lossAverageDurationCandles: average(
      losses.map((trade) => trade.durationCandles),
    ),
    lossMfeAtLeast1R: losses.filter((trade) => trade.mfeR >= 1).length,
    lossMfeAtLeast2R: losses.filter((trade) => trade.mfeR >= 2).length,
  };
}
