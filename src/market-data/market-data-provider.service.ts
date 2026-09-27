import { Injectable } from "@nestjs/common";

import { normalizeTradingSymbol } from "./trading-symbol";

@Injectable()
export class MarketDataProviderService {
  async getBinanceCandles(
    symbol: string,
    timeframe: string,
    limit = 1000,
    initialEndTime = Date.now(),
  ): Promise<
    {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  > {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    this.validateTimeframe(timeframe);

    // Internal names intentionally match Binance Spot's tradable symbols.
    const binanceSymbol = normalizedSymbol;

    if (limit < 1 || limit > 10000) {
      throw new Error(
        `Invalid candle limit: ${limit}. Must be between 1 and 10000.`,
      );
    }

    return this.getBinanceCandlesFromUrl(
      "https://api.binance.com/api/v3/klines",
      binanceSymbol,
      timeframe,
      limit,
      initialEndTime,
    );
  }

  private async getBinanceCandlesFromUrl(
    endpoint: string,
    binanceSymbol: string,
    timeframe: string,
    limit: number,
    initialEndTime: number,
  ): Promise<
    {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  > {
    const allCandles: {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[] = [];

    let endTime = initialEndTime;

    while (allCandles.length < limit) {
      const requestLimit = Math.min(1000, limit - allCandles.length);

      const response = await fetch(
        `${endpoint}?symbol=${binanceSymbol}&interval=${timeframe}&limit=${requestLimit}&endTime=${endTime}`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `Binance market data request failed: ${response.status} ${errorBody}`,
        );
      }

      const data = (await response.json()) as unknown[][];

      if (data.length === 0) {
        break;
      }

      const candles = data.map((candle) => this.parseSpotKline(candle));

      allCandles.unshift(...candles);

      const oldestCandle = candles[0];

      const oldestTime = oldestCandle.time.getTime();

      endTime = oldestTime - 1;

      if (data.length < requestLimit) {
        break;
      }
    }

    return allCandles
      .slice(-limit)
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  async getBinanceHourlyCandles(symbol: string, limit = 1000) {
    return this.getBinanceCandles(symbol, "1h", limit);
  }

  private parseSpotKline(candle: unknown[]): {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } {
    if (candle.length < 6) {
      throw new Error(
        "Binance market data response contains an incomplete kline.",
      );
    }

    const time = new Date(Number(candle[0]));
    const open = Number(candle[1]);
    const high = Number(candle[2]);
    const low = Number(candle[3]);
    const close = Number(candle[4]);
    const volume = Number(candle[5]);

    if (
      !Number.isFinite(time.getTime()) ||
      ![open, high, low, close, volume].every(Number.isFinite) ||
      low > Math.min(open, close) ||
      high < Math.max(open, close) ||
      low < 0 ||
      volume < 0
    ) {
      throw new Error(
        "Binance market data response contains an invalid Spot kline.",
      );
    }

    return { time, open, high, low, close, volume };
  }

  private validateTimeframe(timeframe: string): void {
    const supportedTimeframes = ["15m", "1h", "4h", "1d"];

    if (!supportedTimeframes.includes(timeframe)) {
      throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
  }
}
