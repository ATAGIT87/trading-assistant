import { Injectable } from "@nestjs/common";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";

export interface BacktestTrade {
  riskAmount: number;
  resultR: number | null;
  time: Date;
  action: "BUY" | "SELL";
  confidence: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  trend: TradingSignal["trend"];
  rsi: number;
  adx: number;
  marketCondition: TradingSignal["marketCondition"];
  result: "WIN" | "LOSS" | "OPEN";
  exitTime: Date | null;
}

export interface BacktestResult {
  sellAdxBelow25Trades: number;
sellAdxBelow25Wins: number;
sellAdxBelow25R: number;

sellAdx25To30Trades: number;
sellAdx25To30Wins: number;
sellAdx25To30R: number;

sellAdx30To35Trades: number;
sellAdx30To35Wins: number;
sellAdx30To35R: number;

sellAdx35To40Trades: number;
sellAdx35To40Wins: number;
sellAdx35To40R: number;

sellAdxAbove40Trades: number;
sellAdxAbove40Wins: number;
sellAdxAbove40R: number;

  sellWinAverageRsi: number;
sellLossAverageRsi: number;
sellWinAverageAdx: number;
sellLossAverageAdx: number;

buyWinAverageRsi: number;
buyLossAverageRsi: number;
buyWinAverageAdx: number;
buyLossAverageAdx: number;

  buyTrades: number;
  buyWins: number;
  buyLosses: number;
  buyTotalR: number;

  sellTrades: number;
  sellWins: number;
  sellLosses: number;
  sellTotalR: number;

  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
  trades: BacktestTrade[];

  training: {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
};

test: {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
};
}

@Injectable()
export class BacktestingService {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
  ) {}

  private calculateBacktestSummary(
  trades: BacktestTrade[],
) {
  const completedTrades = trades.filter(
    (trade) =>
      trade.result === "WIN" ||
      trade.result === "LOSS",
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
      completedTrades.length === 0
        ? 0
        : totalR / completedTrades.length,
  };
}

  async run(
  symbol: string,
  timeframe: Timeframe,
): Promise<BacktestResult> {
  const candles =
    await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

  console.log("CANDLES:", candles.length);

  const period = 14;

  const splitIndex = Math.floor(
    candles.length * 0.7,
  );

  const trainingCandles = candles.slice(
    0,
    splitIndex,
  );

  const testCandles = candles.slice(
    splitIndex,
  );

  console.log(
    "TRAINING CANDLES:",
    trainingCandles.length,
  );

  console.log(
    "TEST CANDLES:",
    testCandles.length,
  );

  console.log(
    "TRAINING END:",
    trainingCandles[
      trainingCandles.length - 1
    ]?.time,
  );

  console.log(
    "TEST START:",
    testCandles[0]?.time,
  );

  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  let buyTrades = 0;
  let buyWins = 0;
  let buyLosses = 0;
  let buyTotalR = 0;

  let sellTrades = 0;
  let sellWins = 0;
  let sellLosses = 0;
  let sellTotalR = 0;

  let buyWinRsiSum = 0;
  let buyLossRsiSum = 0;
  let buyWinAdxSum = 0;
  let buyLossAdxSum = 0;

  let sellWinRsiSum = 0;
  let sellLossRsiSum = 0;
  let sellWinAdxSum = 0;
  let sellLossAdxSum = 0;

  let sellAdxBelow25Trades = 0;
  let sellAdxBelow25Wins = 0;
  let sellAdxBelow25R = 0;

  let sellAdx25To30Trades = 0;
  let sellAdx25To30Wins = 0;
  let sellAdx25To30R = 0;

  let sellAdx30To35Trades = 0;
  let sellAdx30To35Wins = 0;
  let sellAdx30To35R = 0;

  let sellAdx35To40Trades = 0;
  let sellAdx35To40Wins = 0;
  let sellAdx35To40R = 0;

  let sellAdxAbove40Trades = 0;
  let sellAdxAbove40Wins = 0;
  let sellAdxAbove40R = 0;

  const trades: BacktestTrade[] = [];

  const trainingTrades: BacktestTrade[] = [];
  const testTrades: BacktestTrade[] = [];

  let i = period * 2 - 1;

  while (i < candles.length) {
    const historicalCandles =
      await this.marketDataService.getHistoricalCandlesUntil(
        symbol,
        timeframe,
        candles[i].time,
      );

    if (
      historicalCandles.length === 0 ||
      historicalCandles[
        historicalCandles.length - 1
      ].time.getTime() !==
        candles[i].time.getTime()
    ) {
      throw new Error(
        `Look-ahead detected at ${candles[
          i
        ].time.toISOString()}`,
      );
    }

    const signal =
      await this.signalsService.generateSignalFromCandles(
        symbol,
        timeframe,
        historicalCandles,
      );

    if (
      signal?.action !== "BUY" &&
      signal?.action !== "SELL"
    ) {
      i++;
      continue;
    }

    const futureCandles =
      candles.slice(i + 1);

    const trade =
      this.findTradeOutcome(
        signal,
        futureCandles,
      );

    const result =
      trade.result === true
        ? "WIN"
        : trade.result === false
          ? "LOSS"
          : "OPEN";

    const resultR =
      trade.result === true
        ? 2
        : trade.result === false
          ? -1
          : 0;

    const backtestTrade: BacktestTrade = {
      time: candles[i].time,
      action: signal.action,
      confidence: signal.confidence,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      trend: signal.trend,
      rsi: signal.rsi,
      adx: signal.adx,
      marketCondition:
        signal.marketCondition,
      result,

      exitTime:
        trade.exitIndex === null
          ? null
          : (
              futureCandles[
                trade.exitIndex
              ]?.time ?? null
            ),

      riskAmount:
        signal.stopLoss === null
          ? 0
          : Math.abs(
              signal.entryPrice -
                signal.stopLoss,
            ),

      resultR:
        trade.result === true
          ? 2
          : trade.result === false
            ? -1
            : null,
    };

    trades.push(backtestTrade);

    if (i < splitIndex) {
      trainingTrades.push(
        backtestTrade,
      );
    } else {
      testTrades.push(backtestTrade);
    }

    totalTrades++;

    if (signal.action === "BUY") {
      buyTrades++;

      if (result === "WIN") {
        buyWins++;
        buyWinRsiSum += signal.rsi;
        buyWinAdxSum += signal.adx;
      }

      if (result === "LOSS") {
        buyLosses++;
        buyLossRsiSum += signal.rsi;
        buyLossAdxSum += signal.adx;
      }

      buyTotalR += resultR;
    }

    if (signal.action === "SELL") {
      sellTrades++;

      if (result === "WIN") {
        sellWins++;
        sellWinRsiSum += signal.rsi;
        sellWinAdxSum += signal.adx;
      }

      if (result === "LOSS") {
        sellLosses++;
        sellLossRsiSum += signal.rsi;
        sellLossAdxSum += signal.adx;
      }

      sellTotalR += resultR;

      if (signal.adx < 25) {
        sellAdxBelow25Trades++;

        if (result === "WIN") {
          sellAdxBelow25Wins++;
        }

        sellAdxBelow25R += resultR;
      } else if (signal.adx < 30) {
        sellAdx25To30Trades++;

        if (result === "WIN") {
          sellAdx25To30Wins++;
        }

        sellAdx25To30R += resultR;
      } else if (signal.adx < 35) {
        sellAdx30To35Trades++;

        if (result === "WIN") {
          sellAdx30To35Wins++;
        }

        sellAdx30To35R += resultR;
      } else if (signal.adx < 40) {
        sellAdx35To40Trades++;

        if (result === "WIN") {
          sellAdx35To40Wins++;
        }

        sellAdx35To40R += resultR;
      } else {
        sellAdxAbove40Trades++;

        if (result === "WIN") {
          sellAdxAbove40Wins++;
        }

        sellAdxAbove40R += resultR;
      }
    }

    if (trade.result === true) {
      winningTrades++;
    }

    if (trade.result === false) {
      losingTrades++;
    }

    if (trade.exitIndex === null) {
      break;
    }

    i =
      i +
      trade.exitIndex +
      2;
  }

  const completedTrades =
    winningTrades + losingTrades;

  const totalR =
    winningTrades * 2 -
    losingTrades;

  const expectancyR =
    completedTrades === 0
      ? 0
      : totalR / completedTrades;

  const buyWinAverageRsi =
    buyWins === 0
      ? 0
      : buyWinRsiSum / buyWins;

  const buyLossAverageRsi =
    buyLosses === 0
      ? 0
      : buyLossRsiSum / buyLosses;

  const buyWinAverageAdx =
    buyWins === 0
      ? 0
      : buyWinAdxSum / buyWins;

  const buyLossAverageAdx =
    buyLosses === 0
      ? 0
      : buyLossAdxSum / buyLosses;

  const sellWinAverageRsi =
    sellWins === 0
      ? 0
      : sellWinRsiSum / sellWins;

  const sellLossAverageRsi =
    sellLosses === 0
      ? 0
      : sellLossRsiSum / sellLosses;

  const sellWinAverageAdx =
    sellWins === 0
      ? 0
      : sellWinAdxSum / sellWins;

  const sellLossAverageAdx =
    sellLosses === 0
      ? 0
      : sellLossAdxSum / sellLosses;

  const training =
    this.calculateBacktestSummary(
      trainingTrades,
    );

  const test =
    this.calculateBacktestSummary(
      testTrades,
    );

  return {
    sellAdxBelow25Trades,
    sellAdxBelow25Wins,
    sellAdxBelow25R,

    sellAdx25To30Trades,
    sellAdx25To30Wins,
    sellAdx25To30R,

    sellAdx30To35Trades,
    sellAdx30To35Wins,
    sellAdx30To35R,

    sellAdx35To40Trades,
    sellAdx35To40Wins,
    sellAdx35To40R,

    sellAdxAbove40Trades,
    sellAdxAbove40Wins,
    sellAdxAbove40R,

    sellWinAverageRsi,
    sellLossAverageRsi,
    sellWinAverageAdx,
    sellLossAverageAdx,

    buyWinAverageRsi,
    buyLossAverageRsi,
    buyWinAverageAdx,
    buyLossAverageAdx,

    buyTrades,
    buyWins,
    buyLosses,
    buyTotalR,

    sellTrades,
    sellWins,
    sellLosses,
    sellTotalR,

    totalTrades,
    winningTrades,
    losingTrades,

    winRate:
      completedTrades === 0
        ? 0
        : (winningTrades /
            completedTrades) *
          100,

    totalR,
    expectancyR,

    training,
    test,

    trades,
  };
}
  private findTradeOutcome(
    signal: TradingSignal,
    futureCandles: MarketCandle[],
  ): {
    result: boolean | null;
    exitIndex: number | null;
  } {
    if (signal.stopLoss === null || signal.takeProfit === null) {
      return {
        result: null,
        exitIndex: null,
      };
    }

    for (let i = 0; i < futureCandles.length; i++) {
      const candle = futureCandles[i];

      const high = Number(candle.high);
      const low = Number(candle.low);

      if (signal.action === "BUY") {
        const hitStopLoss = low <= signal.stopLoss;

        const hitTakeProfit = high >= signal.takeProfit;

        if (hitStopLoss && hitTakeProfit) {
          return {
            result: false,
            exitIndex: i,
          };
        }

        if (hitStopLoss) {
          return {
            result: false,
            exitIndex: i,
          };
        }

        if (hitTakeProfit) {
          return {
            result: true,
            exitIndex: i,
          };
        }
      }

      if (signal.action === "SELL") {
        const hitStopLoss = high >= signal.stopLoss;

        const hitTakeProfit = low <= signal.takeProfit;

        if (hitStopLoss && hitTakeProfit) {
          return {
            result: false,
            exitIndex: i,
          };
        }

        if (hitStopLoss) {
          return {
            result: false,
            exitIndex: i,
          };
        }

        if (hitTakeProfit) {
          return {
            result: true,
            exitIndex: i,
          };
        }
      }
    }

    return {
      result: null,
      exitIndex: null,
    };
  }
}
