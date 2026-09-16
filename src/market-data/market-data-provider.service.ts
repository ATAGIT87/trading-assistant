import { Injectable } from "@nestjs/common";

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
  total_volumes: [number, number][];
}

@Injectable()
export class MarketDataProviderService {
  private readonly baseUrl = "https://api.coingecko.com/api/v3";

  async getLatestPrice(symbol: string): Promise<number> {
    const normalizedSymbol = symbol.toUpperCase();

    if (normalizedSymbol !== "BTCUSD") {
      throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
    }

    const response = await fetch(
      `${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd`,
    );

    if (!response.ok) {
      throw new Error(`Market data request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      bitcoin?: {
        usd?: number;
      };
    };

    const price = data.bitcoin?.usd;

    if (typeof price !== "number") {
      throw new Error("Invalid BTC price returned by market data provider");
    }

    return price;
  }

  async getHourlyMarketData(
    symbol: string,
    days = 30,
  ): Promise<
    {
      time: Date;
      price: number;
      volume: number;
    }[]
  > {
    const normalizedSymbol = symbol.toUpperCase();

    if (normalizedSymbol !== "BTCUSD") {
      throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
    }

    const response = await fetch(
      `${this.baseUrl}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
    );

    if (!response.ok) {
      throw new Error(`Market data request failed: ${response.status}`);
    }

    const data = (await response.json()) as CoinGeckoMarketChartResponse;

    return data.prices.map(([timestamp, price], index) => ({
      time: new Date(timestamp),
      price,
      volume: data.total_volumes[index]?.[1] ?? 0,
    }));
  }

  async getRealCandles(
    symbol: string,
    days = 30,
  ): Promise<
    {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
    }[]
  > {
    const normalizedSymbol = symbol.toUpperCase();

    if (normalizedSymbol !== "BTCUSD") {
      throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
    }

    const response = await fetch(
      `${this.baseUrl}/coins/bitcoin/ohlc?vs_currency=usd&days=1`,
    );

    if (!response.ok) {
      const errorBody = await response.text();

      console.error("CoinGecko OHLC error:", response.status, errorBody);

      throw new Error(
        `Market OHLC request failed: ${response.status} ${errorBody}`,
      );
    }

    const data = (await response.json()) as number[][];

    return data.map(([timestamp, open, high, low, close]) => ({
      time: new Date(timestamp),
      open,
      high,
      low,
      close,
    }));
  }
  async getHourlyCandles(
    symbol: string,
    days = 1,
  ): Promise<
    {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
    }[]
  > {
    const candles = await this.getRealCandles(symbol, days);

    const hourlyCandles = new Map<
      string,
      {
        time: Date;
        open: number;
        high: number;
        low: number;
        close: number;
      }
    >();

    for (const candle of candles) {
      const hour = new Date(candle.time);
      hour.setUTCMinutes(0, 0, 0);

      const key = hour.toISOString();

      const existing = hourlyCandles.get(key);

      if (!existing) {
        hourlyCandles.set(key, {
          time: hour,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        });

        continue;
      }

      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
    }

    return Array.from(hourlyCandles.values()).sort(
      (a, b) => a.time.getTime() - b.time.getTime(),
    );
  }

  async getBinanceHourlyCandles(
    symbol: string,
    limit = 1000,
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
    const normalizedSymbol = symbol.toUpperCase();

    if (normalizedSymbol !== "BTCUSD") {
      throw new Error(`Unsupported symbol: ${normalizedSymbol}`);
    }

    const candles: {
      time: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[] = [];

    let endTime: number | undefined;

    while (candles.length < limit) {
      const remaining = limit - candles.length;
      const requestLimit = Math.min(1000, remaining);

      let url =
        `https://api.binance.com/api/v3/klines` +
        `?symbol=BTCUSDT` +
        `&interval=1h` +
        `&limit=${requestLimit}`;

      if (endTime !== undefined) {
        url += `&endTime=${endTime}`;
      }

      const response = await fetch(url);

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

      const batch = data.map((candle) => ({
        time: new Date(Number(candle[0])),
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
      }));

      candles.unshift(...batch);

      const oldestTimestamp = Number(data[0][0]);

      endTime = oldestTimestamp - 1;

      if (data.length < requestLimit) {
        break;
      }
    }

    return candles.slice(-limit);
  }
}
