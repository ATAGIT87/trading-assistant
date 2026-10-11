# Trading Assistant

Kraken spot analysis, persistent Telegram alerts and simulated trading.
The application does not place real exchange orders.

## Repository layout

```text
src/production/       Active application only
test/checks/          Structural and regression checks
test/research/        Current-strategy replay, CSVs and the latest report
operations/          Maintenance commands and database migrations
docs/                Current strategy, protocol and file map
dist/production/     Generated production build (ignored by Git)
dist-test/           Generated research/check build (ignored by Git)
```

Start with [the Persian file map](docs/STRUCTURE.md) to understand each part.
See [the production cycle](docs/PRODUCTION_CYCLE.md) for dependency relationships.
Production cannot import `test/` or `operations/`; research may import production
to evaluate the same decision and execution rules. `pnpm check:structure` checks
this boundary and rejects production files unreachable from the entry point.

Demo is an active product feature: it records simulated positions and sends
notifications. It belongs to production even when entries are labelled
EXPERIMENTAL. Historical experiment implementations belong to `test/research`.

## Production

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Configure the database and runtime switches in .env.
# Apply operations/migrations/20261005-ccxt-alert-payload.sql if not already applied.
pnpm typecheck
pnpm build
pnpm start:prod
```

`pnpm start:dev` runs the production source with a watcher. The compiled entry
is `dist/production/main.js`. Use one service instance and keep
`DB_SYNCHRONIZE=false` for the existing database.

The sole strategy is `spot-4h-pullback-daily-ema200-basket-v4`: closed Daily EMA200 macro
trend, a bullish 4h pullback candle touching 4h EMA20 or EMA50, structural/2ATR SL,
2R TP from the actual passive entry and cost-aware protection after +1.5R. RSI is not an entry condition.
The watchlist refreshes the top30 online Kraken crypto/EUR pairs by 24h EUR turnover.
Stablecoins/fiat are excluded; stored positions survive watchlist rotation.

New entry/TP intentions use Maker limits; new stops use a Market-stop Demo
proxy with 0.40% fees and 0.10% adverse stop slippage. Pending orders reserve cash for at most24 hours; only filled open positions count
toward the global cap of six. Fill admission rechecks capacity. A stop sell may remain unfilled;
a fee cushion does not guarantee a Maker stop fill. The application still
submits no exchange orders. See [the strategy](docs/STRATEGY.md).

Durable orders reuse the existing alert_delivery payload/actions. No new schema
or database writes were required by the refactor. Previously stored positions
keep cost basis and initial SL/TP; exit monitoring follows Maker-only rules at the recorded execution timeframe. OHLC fill proxies cannot enable APPROVED Demo.

Active API examples:

- `GET /trading-assistant/status`
- `GET /technical-analysis/BTCEUR`
- `GET /signals/BTCEUR/4h`
- `GET /demo-trading/orders`, `/demo-trading/open`, `/demo-trading/summary`

See [the API inventory](docs/API.md).

## Checks and historical research

```sh
pnpm typecheck:test
pnpm test
pnpm build:test
pnpm backtest:spot-basket --data-dir test/research/artifacts/kraken-history-2026-10-06/eur-universe --start 2021-12-21T16:00:00Z --end 2022-05-26T20:00:00Z --output /private/tmp/spot-basket.json
```

The detached command reads official 4h and daily sources, ranks a causal daily
30-asset watchlist across the historical EUR universe, and runs one shared wallet.
Daily EMA200 uses pre-period warmup. Historical ranking uses the previous
completed day's close×volume, a proxy for current rolling24h VWAP×volume.
It records pending/expired limits, open stop sells, realized P/L, marked equity,
drawdown and monthly targets. Verified no-trade intervals create no candles or
fills; unknown gaps freeze exposure. The protected latest year is excluded.
No DB connection, messages or real orders are used, and profit is not guaranteed.
See [the current saved replay](test/research/artifacts/kraken-history-2026-10-06/README.md).

`pnpm start:research` serves read-only portfolio/readiness endpoints on
127.0.0.1:3001 after build:test, with runtime jobs and notifications disabled.
Retired next-open, walk-forward, comparison and variant research implementations
were removed. The maintained archive downloader extracts CRC-verified EUR daily/4h data.

## Operations

```sh
python3 operations/scripts/inspect-project-service.py
python3 operations/scripts/restart-audited-service.py
node test/checks/verify-live-service.cjs
pnpm import:kraken-hourly BTCEUR <csv>
```

The restart command replaces only this workspace's owned listener/watchers.
The live verification checks API and Telegram bot/chat access without sending
messages. The import command explicitly writes real historical candles; it is
not a synthetic seed. Filesystem cleanup never deletes database rows.

The retired `/market-data/backfill-spot/*` stub was removed: Kraken's recent
OHLC endpoint cannot supply the historical coverage that route promised.
Use the archive downloader in `test/research/scripts` and the explicit import
command when historical data is needed.

Current definitions: [strategy](docs/STRATEGY.md), [CCXT details](docs/CCXT.md),
[operating protocol](docs/TRADING_ASSISTANT_PROJECT_PROTOCOL.md).
