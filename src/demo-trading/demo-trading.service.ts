import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { DemoPosition } from "./entities/demo-position.entity";

@Injectable()
export class DemoTradingService {
  constructor(
    @InjectRepository(DemoPosition)
    private readonly demoPositionRepository: Repository<DemoPosition>,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
  ) {}

  resolvePositionOutcome(
    position: Pick<
      DemoPosition,
      "side" | "entry" | "stopLoss" | "takeProfit" | "riskReward"
    >,
    candle: Pick<MarketCandle, "low" | "high">,
  ): {
    status: "OPEN" | "WIN" | "LOSS";
    exitPrice: number | null;
    resultR: number | null;
  } {
    const candleLow = Number(candle.low);
    const candleHigh = Number(candle.high);
    const stopLoss = Number(position.stopLoss);
    const takeProfit = Number(position.takeProfit);

    if (position.side === "BUY") {
      const stopTriggered = candleLow <= stopLoss;
      const takeTriggered = candleHigh >= takeProfit;

      if (stopTriggered && takeTriggered) {
        return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
      }

      if (stopTriggered) {
        return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
      }

      if (takeTriggered) {
        return {
          status: "WIN",
          exitPrice: takeProfit,
          resultR: position.riskReward ?? 1,
        };
      }
    }

    if (position.side === "SELL") {
      const stopTriggered = candleHigh >= stopLoss;
      const takeTriggered = candleLow <= takeProfit;

      if (stopTriggered && takeTriggered) {
        return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
      }

      if (stopTriggered) {
        return { status: "LOSS", exitPrice: stopLoss, resultR: -1 };
      }

      if (takeTriggered) {
        return {
          status: "WIN",
          exitPrice: takeProfit,
          resultR: position.riskReward ?? 1,
        };
      }
    }

    return { status: "OPEN", exitPrice: null, resultR: null };
  }

  async openPosition(symbol: string, timeframe: Timeframe) {
    const signal = await this.signalsService.getLiveV2Signal(symbol, timeframe);

    if (
      signal.action !== "BUY" &&
      signal.action !== "SELL"
    ) {
      return {
        symbol,
        timeframe,
        action: signal.action,
        reason: signal.reason,
        position: null,
      };
    }

    const existingOpenPosition = await this.demoPositionRepository.findOne({
      where: {
        symbol,
        timeframe,
        status: "OPEN",
      },
    });

    if (existingOpenPosition) {
      return {
        symbol,
        timeframe,
        action: signal.action,
        signal,
        reason: "Duplicate open demo position prevented for this symbol/timeframe.",
        position: existingOpenPosition,
      };
    }

    if (signal.stopLoss === null || signal.takeProfit === null) {
      return {
        symbol,
        timeframe,
        action: "NO_TRADE" as const,
        reason: "Actionable signal is missing risk levels.",
        position: null,
      };
    }

    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - signal.entryPrice);

    const newPosition = this.demoPositionRepository.create({
      symbol,
      timeframe,
      side: signal.action,
      entry: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      riskReward: risk > 0 ? reward / risk : null,
      status: "OPEN",
      openedAt: new Date(signal.candleTime),
      closedAt: null,
      exitPrice: null,
      resultR: null,
    });

    const savedPosition = await this.demoPositionRepository.save(newPosition);

    return {
      symbol,
      timeframe,
      action: signal.action,
      signal,
      reason: "Demo position opened from the current live V2 signal.",
      position: savedPosition,
    };
  }

  async getOpenPositions(): Promise<DemoPosition[]> {
    return this.demoPositionRepository.find({
      where: { status: "OPEN" },
      order: { openedAt: "DESC" },
    });
  }

  async getHistory(): Promise<DemoPosition[]> {
    return this.demoPositionRepository.find({
      where: { status: In(["WIN", "LOSS"]) },
      order: { closedAt: "DESC" },
    });
  }

  async checkOpenPositions() {
    const openPositions = await this.getOpenPositions();
    const processed: Array<{
      symbol: string;
      timeframe: Timeframe;
      side: "BUY" | "SELL";
      entry: number;
      stopLoss: number;
      takeProfit: number;
      status: "OPEN" | "WIN" | "LOSS";
      exitPrice: number | null;
      closedAt: Date | null;
      resultR: number | null;
      reason: string;
    }> = [];

    for (const position of openPositions) {
      const latestCandle = await this.getLatestCompletedCandle(
        position.symbol,
        position.timeframe,
      );

      if (!latestCandle) {
        processed.push({
          symbol: position.symbol,
          timeframe: position.timeframe,
          side: position.side,
          entry: Number(position.entry),
          stopLoss: Number(position.stopLoss),
          takeProfit: Number(position.takeProfit),
          status: "OPEN",
          exitPrice: null,
          closedAt: null,
          resultR: null,
          reason: "No completed candle available yet.",
        });
        continue;
      }

      const outcome = this.resolvePositionOutcome(position, latestCandle);

      if (outcome.status === "OPEN") {
        processed.push({
          symbol: position.symbol,
          timeframe: position.timeframe,
          side: position.side,
          entry: Number(position.entry),
          stopLoss: Number(position.stopLoss),
          takeProfit: Number(position.takeProfit),
          status: "OPEN",
          exitPrice: null,
          closedAt: null,
          resultR: null,
          reason: "No SL or TP threshold was reached in the latest completed candle.",
        });
        continue;
      }

      position.status = outcome.status;
      position.exitPrice = outcome.exitPrice;
      position.closedAt = new Date(latestCandle.time);
      position.resultR = outcome.resultR;

      await this.demoPositionRepository.save(position);

      processed.push({
        symbol: position.symbol,
        timeframe: position.timeframe,
        side: position.side,
        entry: Number(position.entry),
        stopLoss: Number(position.stopLoss),
        takeProfit: Number(position.takeProfit),
        status: outcome.status,
        exitPrice: outcome.exitPrice,
        closedAt: position.closedAt,
        resultR: outcome.resultR,
        reason:
          outcome.status === "WIN"
            ? "Take profit threshold was reached."
            : "Stop loss threshold was reached.",
      });
    }

    return {
      checkedAt: new Date(),
      processed,
    };
  }

  private async getLatestCompletedCandle(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle | null> {
    const candles = await this.marketDataService.getHistoricalCandles(
      symbol,
      timeframe,
    );

    const durationMs = this.getTimeframeDurationMs(timeframe);
    const completedCandles = candles.filter(
      (candle) => candle.time.getTime() + durationMs < Date.now(),
    );

    if (completedCandles.length === 0) {
      return null;
    }

    return completedCandles[completedCandles.length - 1];
  }

  private getTimeframeDurationMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case Timeframe.FIFTEEN_MINUTES:
        return 15 * 60 * 1000;
      case Timeframe.ONE_HOUR:
        return 60 * 60 * 1000;
      case Timeframe.FOUR_HOURS:
        return 4 * 60 * 60 * 1000;
      case Timeframe.ONE_DAY:
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }
}
