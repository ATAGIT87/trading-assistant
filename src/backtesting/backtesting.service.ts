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
import { analyzeSellTrades } from "./helpers/sell-analysis.helper";
import { StrategyV2Service } from "../signals/strategy-v2.service";
import { IndicatorsService } from "../indicators/indicators.service";

@Injectable()
export class BacktestingService {
  private readonly feeRate: number;
  private readonly slippageRate: number;

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
    private readonly strategyV2Service: StrategyV2Service,
    private readonly indicatorsService: IndicatorsService,
    private readonly configService: ConfigService,
  ) {
    this.feeRate = this.getNumericConfigValue(
      "BACKTESTING_FEE_RATE",
      0.0005,
    );
    this.slippageRate = this.getNumericConfigValue(
      "BACKTESTING_SLIPPAGE_RATE",
      0.0005,
    );
  }

  private getNumericConfigValue(
    key: string,
    fallback: number,
  ): number {
    const value = Number(this.configService.get<number | string>(key, fallback));

    if (!Number.isFinite(value) || value < 0) {
      return fallback;
    }

    return value;
  }

  private getHigherTimeframeTrendFromCandles(
    candles: { time: Date; close: string | number }[],
    until: Date,
    higherTimeframe: Timeframe,
  ): "BULLISH" | "BEARISH" | "NEUTRAL" | null {
    const completedCandles = candles.filter((candle) =>
      this.isCompletedHigherTimeframeCandle(candle.time, until, higherTimeframe),
    );

    if (completedCandles.length < 28) {
      return null;
    }

    const closes = completedCandles.map((candle) => Number(candle.close));
    const latestClose = closes[closes.length - 1];
    const sma = this.indicatorsService.calculateSma(closes, 14);
    const ema = this.indicatorsService.calculateEma(closes, 14);

    if (sma === null || ema === null) {
      return null;
    }

    const priceVsSma = this.indicatorsService.comparePriceToAverage(
      latestClose,
      sma,
    );
    const priceVsEma = this.indicatorsService.comparePriceToAverage(
      latestClose,
      ema,
    );

    return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
  }

  private isCompletedHigherTimeframeCandle(
    candleTime: Date,
    signalTime: Date,
    candleTimeframe: Timeframe,
  ): boolean {
    const durationMs =
      candleTimeframe === Timeframe.FIFTEEN_MINUTES
        ? 15 * 60 * 1000
        : candleTimeframe === Timeframe.ONE_HOUR
          ? 60 * 60 * 1000
          : candleTimeframe === Timeframe.FOUR_HOURS
            ? 4 * 60 * 60 * 1000
            : candleTimeframe === Timeframe.ONE_DAY
              ? 24 * 60 * 60 * 1000
              : 0;

    return candleTime.getTime() + durationMs < signalTime.getTime();
  }

  async run(
    symbol: string,
    timeframe: Timeframe,
    useHigherTimeframeConfirmation = true,
    excludeHighAdxSell = false,
  ): Promise<BacktestResult> {
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
      useHigherTimeframeConfirmation && higherTimeframe !== null
        ? await this.marketDataService.getHistoricalCandles(
            symbol,
            higherTimeframe,
          )
        : [];

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

        const higherTimeframeTrend =
          useHigherTimeframeConfirmation && higherTimeframe !== null
            ? this.getHigherTimeframeTrendFromCandles(
                higherTimeframeCandles,
                historicalCandles[historicalCandles.length - 1].time,
                higherTimeframe,
              )
            : null;

        const completedHigherTimeframeCandles =
          higherTimeframe !== null
            ? higherTimeframeCandles.filter((candle) =>
                this.isCompletedHigherTimeframeCandle(
                  candle.time,
                  historicalCandles[historicalCandles.length - 1].time,
                  higherTimeframe,
                ),
              )
            : [];

        const higherTimeframeDurationMs =
          higherTimeframe === Timeframe.ONE_HOUR
            ? 60 * 60 * 1000
            : higherTimeframe === Timeframe.FOUR_HOURS
              ? 4 * 60 * 60 * 1000
              : higherTimeframe === Timeframe.ONE_DAY
                ? 24 * 60 * 60 * 1000
                : 0;

        const higherTimeframeCandleTime =
          completedHigherTimeframeCandles.length > 0
            ? completedHigherTimeframeCandles[
                completedHigherTimeframeCandles.length - 1
              ].time
            : undefined;

        const signal = this.strategyV2Service.evaluateCandles(
          historicalCandles,
          0,
          historicalCandles.length,
          higherTimeframeTrend ?? undefined,
          higherTimeframeCandleTime,
          higherTimeframeDurationMs,
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

    const sellAnalysis = analyzeSellTrades(trades);

    console.log("\n========== SELL ANALYSIS ==========");
    console.table(sellAnalysis);
    console.log("===================================\n");

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

      trades,
    };
  }
}
