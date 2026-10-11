import { Injectable } from "@nestjs/common";

import { MarketCandle } from "../market-data/entities/market-candle.entity";

export interface RiskLevels {
  stopLoss: number | null;
  takeProfit: number | null;
  riskReward: number | null;
}

@Injectable()
export class RiskManagerService {
  calculateLevels(
    entryPrice: number,
    candles: MarketCandle[],
    atr: number,
    rewardToRisk = 2,
  ): RiskLevels {
    if (
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(atr) ||
      entryPrice <= 0 ||
      atr <= 0 ||
      candles.length < 10 ||
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

    const recentLow = Math.min(
      ...recentCandles.map((candle) => Number(candle.low)),
    );

    const atrRisk = atr * 2;

    const stopLoss = Math.min(entryPrice - atrRisk, recentLow);
    const takeProfit = entryPrice + (entryPrice - stopLoss) * rewardToRisk;

    const risk = Math.abs(entryPrice - stopLoss);

    const reward = Math.abs(takeProfit - entryPrice);

    if (
      !Number.isFinite(stopLoss) ||
      !Number.isFinite(takeProfit) ||
      stopLoss <= 0 ||
      takeProfit <= 0 ||
      risk <= 0 ||
      stopLoss >= entryPrice ||
      takeProfit <= entryPrice
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
