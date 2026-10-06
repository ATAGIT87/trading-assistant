# Trading Assistant

Kraken spot analysis, persistent Telegram alerts and simulated trading.
The application does not place real exchange orders.

## Repository layout

```text
src/production/       Active application only
test/checks/          Structural and regression checks
test/research/        Historical backtesting, candidate strategies, CSVs and reports
operations/          Maintenance commands and database migrations
docs/                Current strategy, protocol and file map
docs/archive/        Historical notes; not the current specification
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

The sole live strategy is `ccxt-ema50-rsi14-v1`. API and Demo consume
the same closed-candle EMA50/RSI14 core. `RunTradingAssistant` is the only
automated entry owner; Demo's scheduler reconciles data and exits every minute.

Position, committed signal marker and pending notification are stored together.
Telegram delivery remains at-least-once. Historical indicator APIs and the duplicate scanner were removed. Legacy position exits are preserved by
`position-exit-policy.ts`; historical entry strategies are not loaded in production.
Approved entry mode reads previously persisted evidence through
`StrategyApprovalService`; it does not execute backtests. Approved admission
requires evidence of 1m execution, so hourly backtests cannot approve the new
minute exit timing. Demo uses closed minute candles during the current hour;
this remains simulated execution. See [the Spot risk review](docs/SPOT_RISK_REVIEW.md).

Active API examples:

- `GET /trading-assistant/status`
- `GET /technical-analysis/BTCEUR`
- `GET /signals/BTCEUR/1h`
- `GET /demo-trading/open` and `/demo-trading/summary`
- Asset administration and closed-candle inspection/sync/repair endpoints

See [the current API inventory and retired routes](docs/API.md).

## Checks and historical research

```sh
pnpm typecheck:test
pnpm test
pnpm build:test
pnpm backtest:kraken-csv --btc test/research/artifacts/kraken-history-2026-10-06/BTCEUR_60.csv --eth test/research/artifacts/kraken-history-2026-10-06/ETHEUR_60.csv --output /private/tmp/kraken-backtest.json
```

The detached CSV backtest does not connect to PostgreSQL, send messages or
place orders. Its date-dependent protected holdout remains excluded by default.
See [the saved replay](test/research/artifacts/kraken-history-2026-10-06/README.md).

`pnpm start:research` after `pnpm build:test` serves the existing `/backtesting/*`
routes on `127.0.0.1:3001`. These routes are no longer registered in production.
The research process disables automated entries, scheduled jobs and Telegram.
`POST /research-data/build-4h/:symbol` prepares historical higher-timeframe data;
production no longer rebuilds 4h on every Demo reconciliation cycle.
Explicit database-backed backtest endpoints still save evidence in the configured
database; they are distinct from the detached CSV command. Do not run research
against a database you do not intend to write evidence to.

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
