import { BacktestTrade } from "../interfaces/backtest-trade.interface";

export function analyzeSellTrades(trades: BacktestTrade[]) {
  const sellTrades = trades.filter((trade) => trade.action === "SELL");

  const ranges = [
    { name: "ADX < 25", min: 0, max: 25 },
    { name: "ADX 25-30", min: 25, max: 30 },
    { name: "ADX 30-35", min: 30, max: 35 },
    { name: "ADX 35-40", min: 35, max: 40 },
    { name: "ADX >= 40", min: 40, max: Infinity },
  ];

  const analysis = ranges.map((range) => {
    const rangeTrades = sellTrades.filter(
      (trade) => trade.adx >= range.min && trade.adx < range.max,
    );

    const wins = rangeTrades.filter((trade) => trade.result === "WIN").length;

    const losses = rangeTrades.filter(
      (trade) => trade.result === "LOSS",
    ).length;

    const totalR = rangeTrades.reduce(
      (sum, trade) => sum + (trade.resultR ?? 0),
      0,
    );

    const completedTrades = wins + losses;

    return {
      adxRange: range.name,
      trades: rangeTrades.length,
      wins,
      losses,
      winRate: completedTrades === 0 ? 0 : (wins / completedTrades) * 100,
      totalR,
    };
  });

  const highAdxSellTrades = sellTrades.filter((trade) => trade.adx >= 40);

  console.log("\n========== SELL ADX >= 40 ==========");

  console.table(
    highAdxSellTrades.map((trade) => ({
      time: trade.time.toISOString(),
      result: trade.result,
      resultR: trade.resultR,
      confidence: trade.confidence,
      rsi: Number(trade.rsi.toFixed(2)),
      adx: Number(trade.adx.toFixed(2)),
      marketCondition: trade.marketCondition,
      maeR: Number(trade.maeR.toFixed(2)),
      mfeR: Number(trade.mfeR.toFixed(2)),
    })),
  );

  console.log("====================================\n");

  const highAdxSellRsiAnalysis = [
    { name: "RSI < 35", min: 0, max: 35 },
    { name: "RSI 35-40", min: 35, max: 40 },
    { name: "RSI >= 40", min: 40, max: 100 },
  ].map((range) => {
    const rangeTrades = highAdxSellTrades.filter(
      (trade) => trade.rsi >= range.min && trade.rsi < range.max,
    );

    const wins = rangeTrades.filter((trade) => trade.result === "WIN").length;

    const losses = rangeTrades.filter(
      (trade) => trade.result === "LOSS",
    ).length;

    const totalR = rangeTrades.reduce(
      (sum, trade) => sum + (trade.resultR ?? 0),
      0,
    );

    const completedTrades = wins + losses;

    return {
      rsiRange: range.name,
      trades: rangeTrades.length,
      wins,
      losses,
      winRate: completedTrades === 0 ? 0 : (wins / completedTrades) * 100,
      totalR,
    };
  });

  console.log("\n========== SELL ADX >= 40 / RSI ==========");

  console.table(highAdxSellRsiAnalysis);

  console.log("==========================================\n");

  console.log("\n========== SELL ANALYSIS ==========");

  console.table(analysis);

  console.log("===================================\n");

  return analysis;
}
