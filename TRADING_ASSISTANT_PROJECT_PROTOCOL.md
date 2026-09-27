# Trading Assistant Protocol

## Scope

This is a Spot-only decision-support and forward-Demo application. It does not
place real orders, support margin, borrowing, short entries, or futures.

```text
Binance Spot candles → data checks → indicators → research strategy
→ risk levels → backtest/validation → optional Demo → Telegram alert
```

`BUY` opens a simulated long. A `SELL` is never an opening instruction in Spot
mode; exits occur through the simulated stop-loss, take-profit, or the
strategy's declared maximum holding time.

## Current status

No strategy is approved for Demo. The global Demo switch must remain disabled:

```dotenv
DEMO_TRADING_ENABLED=false
```

Existing backtest records are research evidence. They must not be overwritten
or described as live performance.

## Data rules

- Source: Binance Spot Klines only.
- Symbols are explicitly allow-listed in `src/market-data/trading-symbol.ts`.
- A candle is keyed by symbol, timeframe and opening time.
- Signals and exits use closed candles only.
- Before research, verify continuity, valid OHLC ranges, and freshness for every
  symbol/timeframe used by the experiment.

## Research protocol

There is currently no registered research candidate. The pre-registered
`spot-hourly-volume-breakout-v1` candidate was rejected because its validation
results were negative after costs. Rejected candidates are removed from the
active codebase; their historical backtest rows remain only as audit evidence.

1. State the hypothesis and the small, fixed candidate family before reviewing
   validation or holdout results.
2. Record the strategy version, parameters, universe, timeframe, data range,
   fee/slippage assumptions and code revision with each run.
3. Use next-candle-open execution; include round-trip fees and conservative
   slippage.
4. Select only on training data. Validation and test are chronological slices
   that end before the protected cutoff. The protected holdout is a separate,
   final period, is checked exactly once, and can never be folded back into the
   training/validation/test split.
5. Require walk-forward stability across the declared Spot universe and relevant
   market regimes.
6. Compare against a declared passive benchmark and reject an unstable or
   underperforming candidate.

## Demo admission gate

An operator may enable a time-limited Demo experiment only if one immutable
strategy specification has all of the following:

- positive net out-of-sample result after costs;
- sufficient completed trades to make the result informative;
- validation, test, protected holdout and walk-forward results that meet the
  pre-declared criterion;
- drawdown within the pre-declared risk limit;
- no data-quality failure or look-ahead execution;
- explicit operator approval and `DEMO_TRADING_ENABLED=true`.

Demo records fills, exits, fees, equity and drawdown separately from backtests.
It is still simulated performance, not live proof and not investment advice.

## Operations

- Use `DB_SYNCHRONIZE=true` only with a disposable local database.
- Use reviewed migrations for any durable database schema change.
- Keep `.env`, build output, and test coverage outside version control.
- Keep the service single-instance while the scheduler is enabled to avoid
  duplicate market syncs and duplicate alerts.
