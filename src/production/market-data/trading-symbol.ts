import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

export type SupportedTradingSymbol = `${string}EUR`;
export const WATCHLIST_SIZE = 30;
// Bootstrap snapshot only; replaced atomically by the public Kraken liquidity refresh.
export const supportedTradingSymbols: SupportedTradingSymbol[] = [
  "BTCEUR",
  "XRPEUR",
  "ETHEUR",
  "SOLEUR",
  "ZECEUR",
  "NEAREUR",
  "ADAEUR",
  "SUIEUR",
  "HYPEEUR",
  "TAOEUR",
  "QNTEUR",
  "LINKEUR",
  "UNIEUR",
  "ZROEUR",
  "AVAXEUR",
  "AAVEEUR",
  "PUMPEUR",
  "LTCEUR",
  "ICPEUR",
  "DOTEUR",
  "ENAEUR",
  "FILEUR",
  "DOGEEUR",
  "MINAEUR",
  "ATOMEUR",
  "TRXEUR",
  "FETEUR",
  "ARBEUR",
  "HBAREUR",
  "XDCEUR",
];
const excludedBases = new Set([
  "UST",
  "USTC",
  "USDD",
  "USDS",
  "USDP",
  "FRAX",
  "LUSD",
  "FDUSD",
  "USDT",
  "USDC",
  "DAI",
  "EURC",
  "EURT",
  "PYUSD",
  "TUSD",
  "USDE",
  "USDG",
  "RLUSD",
  "USDQ",
  "EURQ",
  "USD1",
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "AUD",
  "CAD",
  "JPY",
]);
export function normalizeTradingSymbol(value: string): SupportedTradingSymbol {
  const symbol = value.trim().toUpperCase();
  if (
    !/^[A-Z0-9]{1,16}EUR$/.test(symbol) ||
    excludedBases.has(symbol.slice(0, -3))
  )
    throw new BadRequestException(`Unsupported crypto/EUR symbol: ${value}.`);
  return symbol as SupportedTradingSymbol;
}
export function rankEurMarkets(
  pairs: Record<string, { wsname?: string; status?: string }>,
  tickers: Record<string, { v?: string[]; p?: string[] }>,
) {
  const ranks = new Map<SupportedTradingSymbol, number>();
  for (const [key, pair] of Object.entries(pairs)) {
    if (!pair || typeof pair.wsname !== "string") continue;
    if (pair.status !== "online" || !pair.wsname?.endsWith("/EUR")) continue;
    const base = pair.wsname
      .slice(0, -4)
      .replace(/^XBT$/, "BTC")
      .replace(/^XDG$/, "DOGE");
    if (excludedBases.has(base) || !/^[A-Z0-9]{1,16}$/.test(base)) continue;
    const ticker = tickers[key],
      turnover = Number(ticker?.v?.[1]) * Number(ticker?.p?.[1]);
    if (!Number.isFinite(turnover) || turnover <= 0) continue;
    ranks.set(`${base}EUR`, turnover);
  }
  return [...ranks]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, WATCHLIST_SIZE)
    .map(([symbol, turnoverEUR24h]) => ({ symbol, turnoverEUR24h }));
}
let refreshedAt = 0;
let refreshing: Promise<void> | undefined;
export function watchlistStatus() {
  return {
    symbols: [...supportedTradingSymbols],
    refreshedAt: refreshedAt ? new Date(refreshedAt) : null,
    ranking: "24H_EUR_TURNOVER",
    refreshIntervalHours: 24,
    excludesStablecoinsAndFiat: true,
  };
}
export async function refreshTradingWatchlist() {
  if (Date.now() - refreshedAt < 86_400_000) return;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const responses = await Promise.all(
      ["AssetPairs", "Ticker"].map(async (path) => {
        const response = await fetch(
          `https://api.kraken.com/0/public/${path}`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) throw new Error("KRAKEN_WATCHLIST_FETCH_FAILED");
        const body = (await response.json()) as {
          error?: unknown[];
          result?: Record<string, unknown>;
        };
        if (!Array.isArray(body.error) || body.error.length || !body.result)
          throw new Error("INVALID_KRAKEN_WATCHLIST");
        return body.result;
      }),
    );
    const ranked = rankEurMarkets(
      responses[0] as Parameters<typeof rankEurMarkets>[0],
      responses[1] as Parameters<typeof rankEurMarkets>[1],
    );
    if (ranked.length !== WATCHLIST_SIZE)
      throw new Error("INSUFFICIENT_LIQUID_EUR_MARKETS");
    supportedTradingSymbols.splice(
      0,
      supportedTradingSymbols.length,
      ...ranked.map((r) => r.symbol),
    );
    refreshedAt = Date.now();
  })().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}
@Injectable()
export class ParseTradingSymbolPipe implements PipeTransform<
  string,
  SupportedTradingSymbol
> {
  transform(value: string): SupportedTradingSymbol {
    return normalizeTradingSymbol(value);
  }
}
