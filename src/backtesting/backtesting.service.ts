import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
  private readonly feeRate: number;
  private readonly slippageRate: number;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
    private readonly configService: ConfigService,
  ) {
    this.feeRate = 0;
    this.slippageRate = 0;
  }

  async run(symbol: string, timeframe: Timeframe): Promise<BacktestResult> {
    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    const higherTimeframe =
      timeframe === Timeframe.FIFTEEN_MINUTES
        ? Timeframe.ONE_HOUR
        : timeframe === Timeframe.ONE_HOUR
          ? Timeframe.FOUR_HOURS
          : timeframe === Timeframe.FOUR_HOURS
            ? Timeframe.ONE_DAY
            : null;

    const higherTimeframeCandles =
      higherTimeframe === null
        ? []
        : await this.marketDataService.getHistoricalCandles(
            symbol,
            higherTimeframe,
          );

    const period = 14;
    const splitIndex = Math.floor(candles.length * 0.7);

    const trades: BacktestTrade[] = [];
    const trainingTrades: BacktestTrade[] = [];
    const testTrades: BacktestTrade[] = [];

    let winningTrades = 0;
    let losingTrades = 0;

    let grossTotalR = 0;
    let totalFeeR = 0;
    let totalSlippageR = 0;

    const processSegment = async (
      startIndex: number,
      endIndex: number,
      targetTrades: BacktestTrade[],
    ) => {
      let i = Math.max(startIndex, period * 2 - 1);

      while (i < endIndex) {
        const historicalCandles = candles.slice(0, i + 1);

        const signal = await this.signalsService.generateSignalFromCandles(
          symbol,
          timeframe,
          historicalCandles,
          higherTimeframeCandles,
        );

        if (signal?.action !== "BUY" && signal?.action !== "SELL") {
          i++;
          continue;
        }

        const futureCandles = candles.slice(i + 1, endIndex);

        const outcome = findTradeOutcome(signal, futureCandles);

        const result =
          outcome.result === true
            ? "WIN"
            : outcome.result === false
              ? "LOSS"
              : "OPEN";

        const riskAmount =
          signal.stopLoss === null
            ? 0
            : Math.abs(signal.entryPrice - signal.stopLoss);

        const grossR =
          outcome.result === true ? 2 : outcome.result === false ? -1 : null;

        let feeR = 0;
        let slippageR = 0;
        let netR: number | null = grossR;

        if (grossR !== null && riskAmount > 0) {
          const entryPrice = signal.entryPrice;

          const exitPrice = outcome.exitPrice ?? entryPrice;

          const entryFee = entryPrice * this.feeRate;

          const exitFee = exitPrice * this.feeRate;

          const totalFee = entryFee + exitFee;

          feeR = totalFee / riskAmount;

          const entrySlippage = entryPrice * this.slippageRate;

          const exitSlippage = exitPrice * this.slippageRate;

          const totalSlippage = entrySlippage + exitSlippage;

          slippageR = totalSlippage / riskAmount;

          netR = grossR - feeR - slippageR;
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
          marketCondition: signal.marketCondition,
          result,

          exitTime:
            outcome.exitIndex === null
              ? null
              : (futureCandles[outcome.exitIndex]?.time ?? null),

          riskAmount,

          resultR: netR,

          maeR: outcome.maeR,
          mfeR: outcome.mfeR,

          durationCandles: outcome.durationCandles,
        };

        trades.push(backtestTrade);
        targetTrades.push(backtestTrade);

        if (grossR !== null) {
          grossTotalR += grossR;
        }

        totalFeeR += feeR;
        totalSlippageR += slippageR;

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

        i = i + outcome.exitIndex + 2;
      }
    };

    await processSegment(0, splitIndex, trainingTrades);

    await processSegment(splitIndex, candles.length, testTrades);

    const completedTrades = winningTrades + losingTrades;

    const totalR = trades.reduce((sum, trade) => sum + (trade.resultR ?? 0), 0);

    const expectancyR = completedTrades === 0 ? 0 : totalR / completedTrades;

    const statistics = calculateBacktestStatistics(trades);

    const training = calculateBacktestSummary(trainingTrades);

    const test = calculateBacktestSummary(testTrades);

    return {
      ...statistics,

      totalTrades: trades.length,

      winningTrades,

      losingTrades,

      winRate:
        completedTrades === 0 ? 0 : (winningTrades / completedTrades) * 100,

      totalR,

      expectancyR,

      grossTotalR,

      totalFeeR,

      totalSlippageR,

      totalCostR: totalFeeR + totalSlippageR,

      training,

      test,

      trades: [],
    };
  }
}
