# Operating protocol

Kraken spot alerts and simulated trading; no real exchange orders.
`ACTIVE_STRATEGY_VERSION=ccxt-ema50-rsi14-v1` selects the only live entry strategy.
Legacy versions are restricted to historical backtests and prior-position exits.

The unified EMA50/RSI14 core must be shared by CCXT, API, Demo and replay.
CCXT tuple: timestamp-ms/open/high/low/close/volume. Kraken raw volume is index6,
not CCXT's index5. Forming-candle data never enters condition/indicator inputs.
Historical evaluation uses the same199-closed-bar window as a200-row live fetch.

RunTradingAssistant is the only automated entry owner and serves active1h assets.
Demo scheduler performs data/exit reconciliation. Existing
positions continue to be monitored even when entry modes are disabled.

Use one service instance, store secrets in.env and keep DB_SYNCHRONIZE=false.
Apply reviewed migrations. Do not delete candle, position or outbox rows during
filesystem housekeeping. Persistent signal markers commit atomically with
positions and pending messages; Telegram transport remains at-least-once.

A BUY pattern still needs cost/risk/capital admission. Confirm actual account
fees and execution assumptions before interpreting net economics. Current trend
and pattern labels are not calibrated forecasts or proof of profitability.

Production sources live only in src/production; historical research, candidate
strategies, checks and datasets live in test. Production imports neither test
nor operations. Build outputs are dist/production and dist-test respectively.
Legacy position compatibility uses a small exit-policy table, not research DI.
Production reads saved strategy evidence; backtest execution is research-only.
Run pnpm check:structure, pnpm typecheck, pnpm typecheck:test, pnpm build and
pnpm test after structural changes. Consult docs/STRUCTURE.md for file roles.

Demo checks fresh closed 1m execution bars during the current hour, after
reconciling contiguous hourly history. Minute bars never enter entry indicators
or hourly candle storage. Missing data must not fabricate exits. Entry analysis
remains 1h. APPROVED mode requires 1m execution evidence; hourly replay is
insufficient. ATR factor and version-specific trailing policies remain unchanged.
