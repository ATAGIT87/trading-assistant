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
  ): RiskLevels {
    if (
      (action !== "BUY" && action !== "SELL") ||
      entryPrice <= 0 ||
      atr <= 0 ||
      candles.length < 5
    ) {
      return {
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
      };
    }

    const recentCandles = candles.slice(-10);

    const recentHigh = Math.max(
      ...recentCandles.map((candle) =>
        Number(candle.high),
      ),
    );

    const recentLow = Math.min(
      ...recentCandles.map((candle) =>
        Number(candle.low),
      ),
    );

    const atrRisk = atr * 1.5;

    let stopLoss: number;
    let takeProfit: number;

    if (action === "BUY") {
      stopLoss = Math.min(
        entryPrice - atrRisk,
        recentLow,
      );

      const risk =
        entryPrice - stopLoss;

      takeProfit =
        entryPrice + risk * 2;
    } else {
      stopLoss = Math.max(
        entryPrice + atrRisk,
        recentHigh,
      );

      const risk =
        stopLoss - entryPrice;

      takeProfit =
        entryPrice - risk * 2;
    }

    const risk =
      Math.abs(entryPrice - stopLoss);

    const reward =
      Math.abs(takeProfit - entryPrice);

    if (risk <= 0) {
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