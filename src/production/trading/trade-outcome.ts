import { nextProfitProtectionStop } from "./profit-protection";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";

export interface TradeOutcome {
  result: boolean | null;
  exitReason:
    "STOP_LOSS" | "TAKE_PROFIT" | "PROFIT_PROTECTION" | "TIME_EXIT" | null;
  exitIndex: number | null;
  exitPrice: number | null;
  maeR: number;
  mfeR: number;
  durationCandles: number;
  /** Raised stop known after the last observed close, valid on the next bar. */
  activeStopLoss?: number;
}

export function findTradeOutcome(
  signal: TradingSignal,
  futureCandles: MarketCandle[],
  maxHoldingCandles: number,
  costRate = 0,
  entryCostPerUnit = signal.entryPrice * costRate,
): TradeOutcome {
  if (signal.stopLoss === null || signal.takeProfit === null) {
    return {
      result: null,
      exitReason: null,
      exitIndex: null,
      exitPrice: null,
      maeR: 0,
      mfeR: 0,
      durationCandles: 0,
    };
  }

  const riskAmount = Math.abs(signal.entryPrice - signal.stopLoss);

  if (riskAmount <= 0) {
    return {
      result: null,
      exitReason: null,
      exitIndex: null,
      exitPrice: null,
      maeR: 0,
      mfeR: 0,
      durationCandles: 0,
    };
  }

  let activeStop = signal.stopLoss;
  let maxMae = 0;
  let maxMfe = 0;

  for (let i = 0; i < futureCandles.length; i++) {
    const candle = futureCandles[i];

    const high = Number(candle.high);
    const low = Number(candle.low);

    if (signal.action === "BUY") {
      const adverseMove = (signal.entryPrice - low) / riskAmount;

      const favorableMove = (high - signal.entryPrice) / riskAmount;

      maxMae = Math.max(maxMae, adverseMove);
      maxMfe = Math.max(maxMfe, favorableMove);

      const stopFill = Math.min(activeStop, Number(candle.open ?? activeStop));
      const hitStopLoss = low <= activeStop;

      const hitTakeProfit = high >= signal.takeProfit;

      if (hitStopLoss && hitTakeProfit) {
        return {
          result: stopFill > signal.entryPrice,
          exitReason:
            signal.action === "BUY" && activeStop > signal.stopLoss
              ? "PROFIT_PROTECTION"
              : "STOP_LOSS",
          exitIndex: i,
          exitPrice: stopFill,
          maeR: maxMae,
          mfeR: maxMfe,
          durationCandles: i + 1,
        };
      }

      if (hitStopLoss) {
        return {
          result: stopFill > signal.entryPrice,
          exitReason:
            signal.action === "BUY" && activeStop > signal.stopLoss
              ? "PROFIT_PROTECTION"
              : "STOP_LOSS",
          exitIndex: i,
          exitPrice: stopFill,
          maeR: maxMae,
          mfeR: maxMfe,
          durationCandles: i + 1,
        };
      }

      if (hitTakeProfit) {
        return {
          result: true,
          exitReason: "TAKE_PROFIT",
          exitIndex: i,
          exitPrice: signal.takeProfit,
          maeR: maxMae,
          mfeR: maxMfe,
          durationCandles: i + 1,
        };
      }
    }

    if (signal.action === "SELL") {
      const adverseMove = (high - signal.entryPrice) / riskAmount;

      const favorableMove = (signal.entryPrice - low) / riskAmount;

      maxMae = Math.max(maxMae, adverseMove);
      maxMfe = Math.max(maxMfe, favorableMove);

      const hitStopLoss = high >= signal.stopLoss;

      const hitTakeProfit = low <= signal.takeProfit;

      if (hitStopLoss && hitTakeProfit) {
        return {
          result: false,
          exitReason: "STOP_LOSS",
          exitIndex: i,
          exitPrice: signal.stopLoss,
          maeR: maxMae,
          mfeR: maxMfe,
          durationCandles: i + 1,
        };
      }

      if (hitStopLoss) {
        return {
          result: false,
          exitReason: "STOP_LOSS",
          exitIndex: i,
          exitPrice: signal.stopLoss,
          maeR: maxMae,
          mfeR: maxMfe,
          durationCandles: i + 1,
        };
      }

      if (hitTakeProfit) {
        return {
          result: true,
          exitReason: "TAKE_PROFIT",
          exitIndex: i,
          exitPrice: signal.takeProfit,
          maeR: maxMae,
          mfeR: maxMfe,
          durationCandles: i + 1,
        };
      }
    }

    // Update only after all exits in this completed candle have been evaluated.
    if (signal.action === "BUY" && signal.profitProtection) {
      activeStop = nextProfitProtectionStop(
        activeStop,
        signal.entryPrice,
        signal.takeProfit,
        Number(candle.close),
        costRate,
        entryCostPerUnit,
      );
    }

    if (i + 1 >= maxHoldingCandles) {
      const close = Number(candle.close);
      const timeExitResult =
        signal.action === "BUY"
          ? close >= signal.entryPrice
          : close <= signal.entryPrice;
      return {
        result: timeExitResult,
        exitReason: "TIME_EXIT",
        exitIndex: i,
        exitPrice: close,
        maeR: maxMae,
        mfeR: maxMfe,
        durationCandles: i + 1,
      };
    }
  }

  return {
    result: null,
    exitReason: null,
    exitIndex: null,
    exitPrice: null,
    maeR: maxMae,
    mfeR: maxMfe,
    durationCandles: futureCandles.length,
    activeStopLoss: activeStop,
  };
}
