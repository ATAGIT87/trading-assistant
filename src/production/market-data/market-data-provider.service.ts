import { Injectable } from "@nestjs/common";

import { normalizeTradingSymbol } from "./trading-symbol";

export type SpotCandle = {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** The application's single live provider: Kraken Spot public OHLC data. */
@Injectable()
export class MarketDataProviderService {
  private readonly krakenPairs: Record<string, string> = {
    BTCEUR: "XBTEUR",
    ETHEUR: "ETHEUR",
  };

  async getSpotCandles(
    symbol: string,
    timeframe: string,
    limit = 720,
  ): Promise<SpotCandle[]> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);
    this.validateTimeframe(timeframe);
    if (!Number.isInteger(limit) || limit < 1 || limit > 720) {
      throw new Error(
        "Kraken Spot OHLC supports a recent window of 1 to 720 candles.",
      );
    }
    const pair = this.krakenPairs[normalizedSymbol];
    if (!pair)
      throw new Error(`No Kraken Spot pair mapping for ${normalizedSymbol}.`);

    const response = await this.fetchKraken(
      `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${this.toKrakenInterval(timeframe)}`,
    );
    if (!response.ok)
      throw new Error(`Kraken market data request failed: ${response.status}`);

    const body = (await response.json()) as {
      error?: string[];
      result?: Record<string, unknown>;
    };
    if (body.error?.length)
      throw new Error(`Kraken market data error: ${body.error.join(", ")}`);
    const rows = Object.entries(body.result ?? {}).find(
      ([key]) => key !== "last",
    )?.[1];
    if (!Array.isArray(rows))
      throw new Error("Kraken market data response contains no OHLC candles.");

    return rows
      .map((row) => this.parseKrakenOhlc(row))
      .slice(-limit)
      .sort((left, right) => left.time.getTime() - right.time.getTime());
  }

  /** Retries only transient transport and service failures; invalid responses fail fast. */
  private async fetchKraken(url: string): Promise<Response> {
    const transientStatuses = new Set([429, 500, 502, 503, 504]);
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok || !transientStatuses.has(response.status))
          return response;
        lastError = new Error(
          `Kraken market data request failed: ${response.status}`,
        );
      } catch (error) {
        lastError = error;
      }
      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1)),
        );
      }
    }
    throw lastError;
  }

  private parseKrakenOhlc(row: unknown): SpotCandle {
    if (!Array.isArray(row) || row.length < 7) {
      throw new Error(
        "Kraken market data response contains an incomplete OHLC candle.",
      );
    }
    const time = new Date(Number(row[0]) * 1000);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[6]);
    if (
      !Number.isFinite(time.getTime()) ||
      ![open, high, low, close, volume].every(Number.isFinite) ||
      low > Math.min(open, close) ||
      high < Math.max(open, close) ||
      low < 0 ||
      volume < 0
    ) {
      throw new Error(
        "Kraken market data response contains an invalid Spot OHLC candle.",
      );
    }
    return { time, open, high, low, close, volume };
  }

  private toKrakenInterval(timeframe: string): number {
    return { "1m": 1, "15m": 15, "1h": 60, "4h": 240, "1d": 1440 }[timeframe]!;
  }

  private validateTimeframe(timeframe: string): void {
    if (
      !(
        timeframe in
        { "1m": true, "15m": true, "1h": true, "4h": true, "1d": true }
      )
    )
      throw new Error(`Unsupported timeframe: ${timeframe}`);
  }
}
