import { Injectable } from "@nestjs/common";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
}

@Injectable()
export class BacktestingService {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
  ) {}
  isTradeWinner(
    signal: TradingSignal,
    futureCandles: MarketCandle[],
  ): boolean | null {
    if (signal.stopLoss === null || signal.takeProfit === null) {
      return null;
    }

    for (const candle of futureCandles) {
      const high = Number(candle.high);
      const low = Number(candle.low);

      if (signal.action === "BUY") {
        if (low <= signal.stopLoss) {
          return false;
        }

        if (high >= signal.takeProfit) {
          return true;
        }
      }

      if (signal.action === "SELL") {
        if (high >= signal.stopLoss) {
          return false;
        }

        if (low <= signal.takeProfit) {
          return true;
        }
      }
    }

    return null;
  }
  async run(symbol: string, timeframe: Timeframe): Promise<BacktestResult> {
    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    console.log("CANDLES:", candles.length);

    let totalTrades = 0;
    let winningTrades = 0;
    let losingTrades = 0;

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
        historicalCandles[historicalCandles.length - 1].time.getTime() !==
          candles[i].time.getTime()
      ) {
        throw new Error(
          `Look-ahead detected at ${candles[i].time.toISOString()}`,
        );
      }
      const signal = await this.signalsService.generateSignalFromCandles(
        symbol,
        timeframe,
        historicalCandles,
      );

      console.log(
        candles[i].time,
        signal?.action,
        signal?.confidence,
        signal?.trend,
        signal?.rsi,
        signal?.adx,
        signal?.marketCondition,
      );

      if (signal?.action !== "BUY" && signal?.action !== "SELL") {
        i++;
        continue;
      }

      totalTrades++;

      const futureCandles = candles.slice(i + 1);

      const trade = this.findTradeOutcome(signal, futureCandles);

      console.log(
        "TRADE:",
        candles[i].time,
        signal.action,
        "Entry:",
        signal.entryPrice,
        "SL:",
        signal.stopLoss,
        "TP:",
        signal.takeProfit,
        "Result:",
        trade.result,
      );

      if (trade.result === true) {
        winningTrades++;
      }

      if (trade.result === false) {
        losingTrades++;
      }

      if (trade.exitIndex === null) {
        break;
      }

      i = i + trade.exitIndex + 2;
    }

    const completedTrades = winningTrades + losingTrades;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate:
        completedTrades === 0 ? 0 : (winningTrades / completedTrades) * 100,
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
