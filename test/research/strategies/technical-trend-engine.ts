import { Injectable } from "@nestjs/common";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { timeframeDurationMs } from "../../../src/production/assets/timeframe.utils";
import { IndicatorsService } from "../indicators/indicators.service";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { assessMarketDataQuality } from "../../../src/production/market-data/market-data-quality";

export type TrendDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type ConfirmedPivot = { price: number; time: Date; confirmedAt: Date };

/** Distinct strict pivots: equal-price plateaus are represented by their last bar. */
export function confirmedTrendPivots(
  candles: MarketCandle[],
  timeframe: Timeframe,
  field: "high" | "low",
): ConfirmedPivot[] {
  const pivots: ConfirmedPivot[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const price = Number(candles[i][field]);
    const left = candles.slice(i - 2, i).map((c) => Number(c[field]));
    const right = candles.slice(i + 1, i + 3).map((c) => Number(c[field]));
    const confirmed =
      field === "high"
        ? left.every((p) => p <= price) &&
          left.some((p) => p < price) &&
          right.every((p) => p < price)
        : left.every((p) => p >= price) &&
          left.some((p) => p > price) &&
          right.every((p) => p > price);
    if (confirmed)
      pivots.push({
        price,
        time: candles[i].time,
        confirmedAt: new Date(
          +candles[i + 2].time + timeframeDurationMs[timeframe],
        ),
      });
  }
  return pivots;
}

@Injectable()
export class TechnicalTrendEngine {
  readonly version = "technical-trend-v1";
  readonly minimumHistory = 55;
  constructor(private readonly indicators: IndicatorsService) {}

  analyze(
    rows: MarketCandle[],
    timeframe: Timeframe,
    asOf = new Date(),
    requireFresh = false,
  ) {
    const quality = assessMarketDataQuality(
      "ANALYSIS",
      timeframe,
      rows,
      asOf,
      this.minimumHistory,
    );
    if (!quality.isUsableForResearch || (requireFresh && !quality.isFresh)) {
      return {
        status: "BLOCKED" as const,
        version: this.version,
        timeframe,
        quality,
        reason: quality.reason,
      };
    }
    const bars = [...rows]
      .filter((b) => +b.time + timeframeDurationMs[timeframe] <= +asOf)
      .sort((a, b) => +a.time - +b.time);
    const closes = bars.map((b) => Number(b.close));
    const ohlc = bars.map((b) => ({
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
    }));
    const ind = this.indicators;
    const ema20 = ind.calculateEma(closes, 20),
      ema50 = ind.calculateEma(closes, 50);
    const prior20 = ind.calculateEma(closes.slice(0, -5), 20),
      prior50 = ind.calculateEma(closes.slice(0, -5), 50);
    const tr = ind.calculateTrueRangesFromCandles(ohlc),
      dm = ind.calculateDirectionalMovements(ohlc);
    const atr = ind.calculateAtr(tr, 14),
      di = ind.calculateDirectionalIndicators(tr, dm.plusDm, dm.minusDm, 14);
    const rawAdx = ind.calculateAdxFromCandles(ohlc, 14);
    const adx = rawAdx ?? (di?.plusDi === 0 && di?.minusDi === 0 ? 0 : null);
    const rsi = ind.calculateRsiFromPrices(closes, 14);
    if (
      [
        ema20,
        ema50,
        prior20,
        prior50,
        atr,
        adx,
        rsi,
        di?.plusDi,
        di?.minusDi,
      ].some((x) => x == null || !Number.isFinite(x))
    ) {
      return {
        status: "BLOCKED" as const,
        version: this.version,
        timeframe,
        quality,
        reason: "Invalid trend indicators.",
      };
    }
    const close = closes.at(-1)!;
    const highs = confirmedTrendPivots(
      bars.slice(-120),
      timeframe,
      "high",
    ).slice(-2);
    const lows = confirmedTrendPivots(bars.slice(-120), timeframe, "low").slice(
      -2,
    );
    const enough = highs.length === 2 && lows.length === 2;
    const higherHighs = enough && highs[1].price > highs[0].price;
    const higherLows = enough && lows[1].price > lows[0].price;
    const lowerHighs = enough && highs[1].price < highs[0].price;
    const lowerLows = enough && lows[1].price < lows[0].price;
    const structure = !enough
      ? "INSUFFICIENT"
      : higherHighs && higherLows
        ? "RISING"
        : lowerHighs && lowerLows
          ? "FALLING"
          : "MIXED";
    const bullishStructure = structure === "RISING" && close >= lows[1].price;
    const bearishStructure = structure === "FALLING" && close <= highs[1].price;
    const bullishMomentum =
      ema20! > ema50! && ema20! > prior20! && di!.plusDi > di!.minusDi;
    const bearishMomentum =
      ema20! < ema50! && ema20! < prior20! && di!.minusDi > di!.plusDi;
    const bullish =
      close > ema50! &&
      ema50! > prior50! &&
      (bullishStructure || bullishMomentum);
    const bearish =
      close < ema50! &&
      ema50! < prior50! &&
      (bearishStructure || bearishMomentum);
    const direction: TrendDirection = bullish
      ? "BULLISH"
      : bearish
        ? "BEARISH"
        : "NEUTRAL";
    const slopeAtr = atr! > 0 ? (ema50! - prior50!) / atr! : 0;
    const phase = bullish
      ? close < ema20! || di!.plusDi <= di!.minusDi
        ? "PULLBACK"
        : "ADVANCING"
      : bearish
        ? close > ema20! || di!.minusDi <= di!.plusDi
          ? "RALLY"
          : "DECLINING"
        : adx! < 20 && Math.abs(slopeAtr) <= 0.25
          ? "RANGE"
          : "TRANSITION";
    return {
      status: "OK" as const,
      version: this.version,
      timeframe,
      quality,
      decisionAt: new Date(+bars.at(-1)!.time + timeframeDurationMs[timeframe]),
      direction,
      phase,
      strength: adx! >= 25 ? "STRONG" : adx! < 20 ? "WEAK" : "DEVELOPING",
      evidence: {
        priceAboveEma50: close > ema50!,
        ema50Rising: ema50! > prior50!,
        bullishStructure,
        bearishStructure,
        bullishMomentum,
        bearishMomentum,
      },
      indicators: {
        close,
        ema20: ema20!,
        ema50: ema50!,
        ema50ChangeAtr: slopeAtr,
        atr: atr!,
        adx: adx!,
        rsi: rsi!,
        ...di!,
      },
      structure: { state: structure, highs, lows },
      reason: `${direction}: ${phase}; ${structure} structure; ADX describes strength, not direction.`,
    };
  }
}
