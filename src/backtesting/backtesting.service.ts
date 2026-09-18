import { Injectable } from "@nestjs/common";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestTrade } from "./interfaces/backtest-trade.interface";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { findTradeOutcome } from "./helpers/backtest-outcome.helper";
import { calculateBacktestSummary } from "./helpers/backtest-summary.helper";
import { calculateBacktestStatistics } from "./helpers/backtest-statistics.helper";

@Injectable()
export class BacktestingService {
  private readonly FEE_RATE = 0.001;
  private readonly SLIPPAGE_RATE = 0.0005;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
  ) {}

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

    const splitIndex =
      Math.floor(candles.length * 0.7);

    const trainingCandles =
      candles.slice(0, splitIndex);

    const testCandles =
      candles.slice(splitIndex);

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

    const trades: BacktestTrade[] = [];

    const trainingTrades: BacktestTrade[] = [];
    const testTrades: BacktestTrade[] = [];

    let winningTrades = 0;
    let losingTrades = 0;

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

      const outcome =
        findTradeOutcome(
          signal,
          futureCandles,
        );

      const result =
        outcome.result === true
          ? "WIN"
          : outcome.result === false
            ? "LOSS"
            : "OPEN";

      const riskAmount =
        signal.stopLoss === null
          ? 0
          : Math.abs(
              signal.entryPrice -
                signal.stopLoss,
            );

      const grossR =
        outcome.result === true
          ? 2
          : outcome.result === false
            ? -1
            : null;

      let netR: number | null = null;

      if (
        grossR !== null &&
        riskAmount > 0 &&
        outcome.exitPrice !== null
      ) {
        const entryPrice =
          signal.entryPrice;

        const exitPrice =
          outcome.exitPrice;

        const entryExecutionPrice =
          signal.action === "BUY"
            ? entryPrice *
              (1 + this.SLIPPAGE_RATE)
            : entryPrice *
              (1 - this.SLIPPAGE_RATE);

        const exitExecutionPrice =
          signal.action === "BUY"
            ? exitPrice *
              (1 - this.SLIPPAGE_RATE)
            : exitPrice *
              (1 + this.SLIPPAGE_RATE);

        const entryFee =
          entryExecutionPrice *
          this.FEE_RATE;

        const exitFee =
          exitExecutionPrice *
          this.FEE_RATE;

        const totalTradingCost =
          entryFee +
          exitFee;

        const priceSlippageCost =
          Math.abs(
            entryExecutionPrice -
              entryPrice,
          ) +
          Math.abs(
            exitExecutionPrice -
              exitPrice,
          );

        const totalCost =
          totalTradingCost +
          priceSlippageCost;

        const costR =
          totalCost /
          riskAmount;

        netR =
          grossR -
          costR;
      }

      const backtestTrade: BacktestTrade = {
        time: candles[i].time,
        action: signal.action,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        exitPrice: outcome.exitPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        trend: signal.trend,
        rsi: signal.rsi,
        adx: signal.adx,
        marketCondition:
          signal.marketCondition,
        result,

        exitTime:
          outcome.exitIndex === null
            ? null
            : (
                futureCandles[
                  outcome.exitIndex
                ]?.time ?? null
              ),

        riskAmount,

        resultR: netR,

        maeR: outcome.maeR,
        mfeR: outcome.mfeR,

        durationCandles:
          outcome.durationCandles,
      };

      trades.push(backtestTrade);

      if (i < splitIndex) {
        trainingTrades.push(
          backtestTrade,
        );
      } else {
        testTrades.push(
          backtestTrade,
        );
      }

      if (netR !== null) {
        if (netR > 0) {
          winningTrades++;
        } else if (netR < 0) {
          losingTrades++;
        }
      }

      if (outcome.exitIndex === null) {
        break;
      }

      i =
        i +
        outcome.exitIndex +
        2;
    }

    const completedTrades =
      winningTrades +
      losingTrades;

    const totalR =
      trades.reduce(
        (sum, trade) =>
          sum + (trade.resultR ?? 0),
        0,
      );

    const expectancyR =
      completedTrades === 0
        ? 0
        : totalR / completedTrades;

    const statistics =
      calculateBacktestStatistics(
        trades,
      );

    const training =
      calculateBacktestSummary(
        trainingTrades,
      );

    const test =
      calculateBacktestSummary(
        testTrades,
      );

    return {
      ...statistics,

      totalTrades:
        trades.length,

      winningTrades,

      losingTrades,

      winRate:
        completedTrades === 0
          ? 0
          : (
              winningTrades /
              completedTrades
            ) *
            100,

      totalR,

      expectancyR,

      training,

      test,

      trades: [],
    };
  }
}