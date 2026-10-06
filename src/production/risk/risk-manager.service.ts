import { Injectable } from "@nestjs/common";

import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { SignalAction } from "../signals/signal.types";

export interface RiskLevels {
  stopLoss: number | null;
  takeProfit: number | null;
  riskReward: number | null;
}

@Injectable()
export class RiskManagerService {
  calculateLevels(
    action: SignalAction,
    entryPrice: number,
    candles: MarketCandle[],
    atr: number,
    rewardToRisk = 2,
  ): RiskLevels {
    if (
      (action !== "BUY" && action !== "SELL") ||
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(atr) ||
      entryPrice <= 0 ||
      atr <= 0 ||
      candles.length < 5 ||
      !Number.isFinite(rewardToRisk) ||
      rewardToRisk < 1
    ) {
      return {
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
      };
    }

    const recentCandles = candles.slice(-10);
    if (
      recentCandles.some((candle) => {
        const high = Number(candle.high),
          low = Number(candle.low);
        return (
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          low <= 0 ||
          high < low
        );
      })
    )
      return { stopLoss: null, takeProfit: null, riskReward: null };

    const recentHigh = Math.max(
      ...recentCandles.map((candle) => Number(candle.high)),
    );

    const recentLow = Math.min(
      ...recentCandles.map((candle) => Number(candle.low)),
    );

    const atrRisk = atr * 1.5;

    let stopLoss: number;
    let takeProfit: number;

    if (action === "BUY") {
      stopLoss = Math.min(entryPrice - atrRisk, recentLow);

      const risk = entryPrice - stopLoss;

      takeProfit = entryPrice + risk * rewardToRisk;
    } else {
      stopLoss = Math.max(entryPrice + atrRisk, recentHigh);

      const risk = stopLoss - entryPrice;

      takeProfit = entryPrice - risk * rewardToRisk;
    }

    const risk = Math.abs(entryPrice - stopLoss);

    const reward = Math.abs(takeProfit - entryPrice);

    if (
      !Number.isFinite(stopLoss) ||
      !Number.isFinite(takeProfit) ||
      stopLoss <= 0 ||
      takeProfit <= 0 ||
      risk <= 0 ||
      (action === "BUY" &&
        (stopLoss >= entryPrice || takeProfit <= entryPrice)) ||
      (action === "SELL" &&
        (stopLoss <= entryPrice || takeProfit >= entryPrice))
    ) {
      return {
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
      };
    }

    return {
      stopLoss,
      takeProfit,
      riskReward: reward / risk,
    };
  }
}
