# Trading Assistant

Spot-only cryptocurrency market-analysis and forward-Demo system. It creates
technical research results and Telegram alerts; it never submits an exchange
order and it does not promise profitability.

## Safety model

- Market data is obtained from Binance Spot Klines and stored in PostgreSQL.
- Only fully closed candles may influence a signal.
- An opening position is long-only (`BUY`). `SELL` is not a Spot entry.
- `DEMO_TRADING_ENABLED=false` is the global default. The scheduler does
  nothing until an operator deliberately enables it.
- A backtest is research evidence, not proof of a future edge. A strategy must
  pass the documented validation gates before a forward Demo experiment.

## Local setup

1. Copy `.env.example` to `.env` and set database and Telegram values.
2. For a disposable fresh local database only, set `DB_SYNCHRONIZE=true` for
   the initial schema creation. Keep it `false` for a durable Demo database.
3. Install and run:

```bash
pnpm install
pnpm run start:dev
```

The service listens on `PORT` (default `3000`).

## Operating sequence

1. Backfill/sync Spot candles with `POST /market-data/backfill-binance/:symbol/:timeframe`.
2. Run research and backtests; preserve the final holdout until the candidate
   family and selection rule are frozen.
3. Review costs, drawdown, trade count, benchmark comparison and walk-forward
   results.
4. Explicitly approve one version, then enable a time-limited forward Demo
   run. Keep real execution out of scope.

## Research rule

Strategies in `src/signals` are candidates, not approved systems. The current
stored evidence rejects every candidate. Do not enable Demo merely because a
single symbol, period, or backtest split looks profitable.

See [TRADING_ASSISTANT_PROJECT_PROTOCOL.md](TRADING_ASSISTANT_PROJECT_PROTOCOL.md)
for the architecture, acceptance gates, and operational restrictions.
