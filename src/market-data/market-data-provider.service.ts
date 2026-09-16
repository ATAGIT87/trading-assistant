import { Injectable } from "@nestjs/common";

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
  total_volumes: [number, number][];
}

@Injectable()
export class MarketDataProviderService {
  private readonly baseUrl =
    "https://api.coingecko.com/api/v3";

  async getLatestPrice(symbol: string): Promise<number> {
    const normalizedSymbol = symbol.toUpperCase();

    if (normalizedSymbol !== "BTCUSD") {
      throw new Error(
        `Unsupported symbol: ${normalizedSymbol}`,
      );
    }

    const response = await fetch(
      `${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd`,
    );

    if (!response.ok) {
      throw new Error(
        `Market data request failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      bitcoin?: {
        usd?: number;
      };
    };

    const price = data.bitcoin?.usd;

    if (typeof price !== "number") {
      throw new Error(
        "Invalid BTC price returned by market data provider",
      );
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
      throw new Error(
        `Unsupported symbol: ${normalizedSymbol}`,
      );
    }

    const response = await fetch(
      `${this.baseUrl}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
    );

    if (!response.ok) {
      throw new Error(
        `Market data request failed: ${response.status}`,
      );
    }

    const data =
      (await response.json()) as CoinGeckoMarketChartResponse;

    return data.prices.map(([timestamp, price], index) => ({
      time: new Date(timestamp),
      price,
      volume: data.total_volumes[index]?.[1] ?? 0,
    }));
  }

  async getHourlyCandles(
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
    throw new Error(
      `Unsupported symbol: ${normalizedSymbol}`,
    );
  }

  const response = await fetch(
  `${this.baseUrl}/coins/bitcoin/ohlc?vs_currency=usd&days=1`,
);

  if (!response.ok) {
    const errorBody = await response.text();

    console.error(
      "CoinGecko OHLC error:",
      response.status,
      errorBody,
    );

    throw new Error(
      `Market OHLC request failed: ${response.status} ${errorBody}`,
    );
  }

  const data =
    (await response.json()) as number[][];

  return data.map(
    ([timestamp, open, high, low, close]) => ({
      time: new Date(timestamp),
      open,
      high,
      low,
      close,
    }),
  );
}

}