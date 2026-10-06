# Unified runtime strategy

`ccxt-ema50-rsi14-v1` is the sole live entry strategy. The same implementation
serves CCXT analysis, Signals API, technical-analysis API, Demo and
stored-candle backtests. Legacy versions remain available only for explicit
historical backtests and the exit policies of existing positions.

## Entry rule

Fetch 200 Kraken CCXT OHLCV rows, require the forming bucket and evaluate the
newest fully closed candle at raw index -2. Numeric close arrays exclude the
forming row. The equivalent historical evaluator uses the latest199 closed bars.

BUY requires closed close strictly above EMA50 and a new upward RSI14 hook:
previous RSI <35, current RSI >previous, previous <=beforePrevious, and an
observed prior crossing from >=35 into the current oversold episode. The hook
may remain below35. No 4H trend, volume breakout or v7 entry filter is applied.
The forming candle's close is notification metadata only.

## Execution and risk

One Nest runner analyzes all active1h assets through a coalesced CCXT snapshot
service. It polls every minute and excludes the first ten seconds of an hour.
Only this runner opens automated Demo positions. The Demo
scheduler synchronizes data and reconciles exits every minute, without an entry loop.

RiskManagerService supplies a structural stop from recent lows/1.5ATR and a2R
planned target. Demo applies next-open fill/rebasing, minimum gross1R and net0.5R,
configured fee/slippage, at most two positions, EUR100 spend cap and at most1%
account risk. Pattern match and executable entry are separate decisions; rejected
entries do not become alerts. CCXT remains experimental until separately approved.
Static SL/TP apply to new positions; no v7 profit protection or24-bar time exit
is silently inherited. Existing legacy positions keep their recorded exit policy.

## Exit observation

Hourly entries keep their hourly closed-candle indicators. Demo reconciles closed
hourly history, then checks fresh, contiguous closed 1m candles in the current
hour, including the first hour after entry. Minute bars are execution telemetry;
they never enter signal inputs or hourly storage. Missing hourly/minute history
blocks advancing the exit cursor. Same-minute SL/TP ambiguity chooses the stop;
gaps below the stop can produce a worse simulated fill.

Polling is every minute, with completed candles and network latency; it is not
tick-level execution or a native Kraken stop. Historical hourly backtests do not
validate minute exit timing. APPROVED admission now requires evidence labelled
with 1m execution resolution; legacy/hourly evidence cannot grant approval.
Experimental Demo still uses its explicit entry switches and the same risk limits.

See [the reviewed Spot risk suggestions](SPOT_RISK_REVIEW.md).

## Durability

Signal timestamp marker, Demo position and pending Telegram payload commit in
one PostgreSQL transaction. All entry admission reads share a portfolio advisory
lock. Apply `operations/migrations/20261005-ccxt-alert-payload.sql` before startup.
Transport retries use the existing outbox. Telegram is at-least-once, so an
acknowledgement crash can repeat delivery despite unique signal-event creation.

No confidence probability is fitted and no profitability is claimed. The saved
2026-10-06 historical replay produced 9 BTC/EUR trades with -0.6102 net R and
6 ETH/EUR trades with -3.3495 net R. These independent market results are not
a shared-capital portfolio return. The protected holdout was excluded.
See [the replay report](../test/research/artifacts/kraken-history-2026-10-06/README.md).
Structural cleanup preserved all signals, trades and sequential results.
