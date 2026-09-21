import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Timeframe } from "../assets/enums/timeframe.enum";
import { Signal } from "./entities/signal.entity";
import { TradingSignal } from "./signal.types";

@Injectable()
export class SignalStorageService {
  constructor(
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
  ) {}

  async saveSignal(
    symbol: string,
    timeframe: Timeframe,
    signal: TradingSignal,
  ): Promise<Signal> {
    const entity = this.signalRepository.create({
      symbol,
      timeframe,
      action: signal.action,
      confidence: signal.confidence,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      trend: signal.trend,
      rsi: signal.rsi,
      adx: signal.adx,
      marketCondition: signal.marketCondition,
      isStrongSetup: signal.isStrongSetup,
      reason: signal.reason,
      candleTime: signal.candleTime,
    });

    return this.signalRepository.save(entity);
  }

  async getSignalHistory(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<Signal[]> {
    return this.signalRepository.find({
      where: {
        symbol,
        timeframe,
      },
      order: {
        createdAt: "DESC",
      },
      take: 50,
    });
  }

  async getLatestSignal(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<Signal | null> {
    return this.signalRepository.findOne({
      where: {
        symbol,
        timeframe,
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  async getSignalByCandleTime(
    symbol: string,
    timeframe: Timeframe,
    candleTime: Date,
  ): Promise<Signal | null> {
    return this.signalRepository.findOne({
      where: {
        symbol,
        timeframe,
        candleTime,
      },
    });
  }
}
