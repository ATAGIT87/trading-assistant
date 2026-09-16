import { Injectable } from "@nestjs/common";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";

export interface BacktestTrade {
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
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  trades: BacktestTrade[];
}

@Injectable()
export class BacktestingService {
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

    let totalTrades = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    const trades: BacktestTrade[] = [];

    const period = 14;

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
        ].time.getTime() !== candles[i].time.getTime()
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

      totalTrades++;

      const futureCandles = candles.slice(i + 1);

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

      if (trade.result === true) {
        winningTrades++;
      }

      if (trade.result === false) {
        losingTrades++;
      }

      trades.push({
        time: candles[i].time,
        action: signal.action,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        trend: signal.trend,
        rsi: signal.rsi,
        adx: signal.adx,
        marketCondition: signal.marketCondition,
        result,
        exitTime:
          trade.exitIndex === null
            ? null
            : futureCandles[
                trade.exitIndex
              ]?.time ?? null,
      });

      if (trade.exitIndex === null) {
        break;
      }

      i = i + trade.exitIndex + 2;
    }

    const completedTrades =
      winningTrades + losingTrades;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate:
        completedTrades === 0
          ? 0
          : (winningTrades / completedTrades) * 100,
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
    if (
      signal.stopLoss === null ||
      signal.takeProfit === null
    ) {
      return {
        result: null,
        exitIndex: null,
      };
    }

    for (
      let i = 0;
      i < futureCandles.length;
      i++
    ) {
      const candle = futureCandles[i];

      const high = Number(candle.high);
      const low = Number(candle.low);

      if (signal.action === "BUY") {
        const hitStopLoss =
          low <= signal.stopLoss;

        const hitTakeProfit =
          high >= signal.takeProfit;

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
        const hitStopLoss =
          high >= signal.stopLoss;

        const hitTakeProfit =
          low <= signal.takeProfit;

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