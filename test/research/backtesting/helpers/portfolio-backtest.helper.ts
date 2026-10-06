import { StrategyEvidenceResult } from "../../../../src/production/strategy-approval/evidence-result";
import { PortfolioBacktestResult } from "../interfaces/portfolio-backtest-result.interface";
import { Timeframe } from "../../../../src/production/assets/enums/timeframe.enum";
import { summarizeCapacityConstrainedSegment } from "./portfolio-capacity.helper";

export function aggregatePortfolioBacktests(
  timeframe: Timeframe,
  results: Array<{ symbol: string; result: StrategyEvidenceResult }>,
  maxOpenPositions = 1,
): PortfolioBacktestResult {
  const strategyVersion = results[0]?.result.strategyVersion ?? "unknown";
  const aggregateSummary = (segment: "training" | "validation" | "test") => {
    const trades = results.flatMap(({ result }) =>
      result.trades.filter((trade) => trade.segment === segment),
    );
    return summarizeCapacityConstrainedSegment(trades, maxOpenPositions)
      .summary;
  };

  const training = aggregateSummary("training");
  const validation = aggregateSummary("validation");
  const test = aggregateSummary("test");
  const totalTrades =
    training.totalTrades + validation.totalTrades + test.totalTrades;
  const totalR = training.totalR + validation.totalR + test.totalR;
  const acceptedTrades = ["training", "validation", "test"].flatMap(
    (segment) =>
      summarizeCapacityConstrainedSegment(
        results.flatMap(({ result }) =>
          result.trades.filter((trade) => trade.segment === segment),
        ),
        maxOpenPositions,
      ).accepted,
  );
  const grossTotalR = acceptedTrades.reduce(
    (sum, trade) => sum + (trade.grossR ?? 0),
    0,
  );
  const totalFeeR = acceptedTrades.reduce((sum, trade) => sum + trade.feeR, 0);
  const totalSlippageR = acceptedTrades.reduce(
    (sum, trade) => sum + trade.slippageR,
    0,
  );

  return {
    strategyVersion,
    timeframe,
    includesProtectedHoldout: false,
    members: results.map(({ symbol, result }) => ({
      symbol,
      totalTrades: result.totalTrades,
      totalR: result.totalR,
      expectancyR: result.expectancyR,
      training: result.training,
      validation: result.validation,
      test: result.test,
    })),
    aggregate: {
      totalTrades,
      totalR,
      expectancyR: totalTrades === 0 ? 0 : totalR / totalTrades,
      grossTotalR,
      totalFeeR,
      totalSlippageR,
      totalCostR: totalFeeR + totalSlippageR,
      training,
      validation,
      test,
    },
  };
}
