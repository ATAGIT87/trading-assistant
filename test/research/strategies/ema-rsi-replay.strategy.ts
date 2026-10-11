import { Injectable } from "@nestjs/common";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { EmaRsiSpotStrategy } from "../../../src/production/trading/ema-rsi-spot.strategy";
import {
  Candle,
  evaluateClosedMarket,
  FOUR_HOURS_MS,
} from "../../../src/production/trading/ccxt/analyze-market";

/** 4h adapter; independent daily source is filtered to closed bars by the production evaluator. */
@Injectable()
export class EmaRsiReplayStrategy extends EmaRsiSpotStrategy {
  readonly minimumHistory = 50;
  private readonly daily = new Map<string, Candle[]>();
  constructor(risk: RiskManagerService) {
    super(risk);
  }
  setDailyHistory(symbol: string, rows: MarketCandle[]) {
    this.daily.set(
      symbol,
      rows.map((c) => ({
        timestamp: +c.time,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
      })),
    );
  }
  evaluateCandles(candles: MarketCandle[]) {
    const history = candles
      .slice(-719)
      .map((c) => ({
        timestamp: +c.time,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
      }));
    const last = history.at(-1),
      symbol = candles.at(-1)?.symbol ?? "";
    return this.signalFromAnalysis(
      evaluateClosedMarket(
        symbol,
        "4h",
        history,
        FOUR_HOURS_MS,
        last ? last.timestamp + FOUR_HOURS_MS : 0,
        undefined,
        this.daily.get(symbol) ?? [],
      ),
    );
  }
}
