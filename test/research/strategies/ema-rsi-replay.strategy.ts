import { Injectable } from "@nestjs/common";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { TradingSignal } from "../../../src/production/signals/signal.types";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { EmaRsiSpotStrategy } from "../../../src/production/trading/ema-rsi-spot.strategy";
import { evaluateClosedMarket } from "../../../src/production/trading/ccxt/analyze-market";
import { TradingStrategy } from "./trading-strategy.port";

/** Adapts historical closed candles to the unchanged production decision core. */
@Injectable()
export class EmaRsiReplayStrategy
  extends EmaRsiSpotStrategy
  implements TradingStrategy
{
  readonly evaluationScope = "PORTFOLIO" as const;
  readonly minimumHistory = 50;
  readonly supportedTimeframes = [Timeframe.ONE_HOUR] as const;
  readonly requiresHigherTimeframeConfirmation = false;
  readonly maxHoldingCandles = Number.MAX_SAFE_INTEGER;
  readonly profitProtection = false;

  constructor(risk: RiskManagerService) {
    super(risk);
  }

  getTrend(candles: MarketCandle[]): TradingSignal["trend"] | null {
    if (!candles.length) return null;
    return this.evaluateCandles(candles).trend;
  }

  evaluateCandles(
    candles: MarketCandle[],
    startIndex = 0,
    endIndex = candles.length,
  ): TradingSignal {
    const boundedEnd = Math.min(endIndex, candles.length);
    const prefix = candles.slice(
      Math.max(startIndex, boundedEnd - 199),
      boundedEnd,
    );
    const history = prefix.map((c) => ({
      timestamp: +c.time,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }));
    const last = history.at(-1);
    return this.signalFromAnalysis(
      evaluateClosedMarket(
        "",
        "1h",
        history,
        3_600_000,
        last ? last.timestamp + 3_600_000 : Date.now(),
      ),
    );
  }
}
