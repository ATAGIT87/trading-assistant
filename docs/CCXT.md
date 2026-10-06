# Closed-candle CCXT analyzer

```ts
// From the project root:
import { analyzeMarket } from './src/production/trading/ccxt/analyze-market';
const result = await analyzeMarket('BTC/EUR', '1h');
if (result.shouldBuy) {
  // Deduplicate alert delivery using symbol + timeframe + result.candle.timestamp.
}
```

One cached Kraken CCXT client, rate limiting enabled, 15-second request timeout,
public market data only. Fetch requests 200 candles; if the last candle is forming,
199 closed candles normally remain. No historical .some() match can create a BUY
without the latest closed candle's own qualifying RSI turn.

Inputs map `[timestampMilliseconds, open, high, low, close, volume]`. EMA50 and
RSI14 consume chronological numeric CLOSE values; high/low/open are mapped and
validated but are not their indicator inputs. Warmup-truncated outputs align by
their final values. Gap, duplicate, invalid, insufficient and stale series fail closed.

BUY: newest fully closed close > EMA50, preceding RSI <35, current RSI rising,
and preceding RSI <= the RSI before it. An actual crossing from >=35 into the
preceding bar's below-35 episode must be observable in available RSI history.
The hook may still be below35 or recover above35. Continued RSI ascent is not a
new hook. This is an explicit interpretation of the requested rule; it is not a
claim that every oversold pullback or the next candle will be profitable.

Repeated polling of the same qualifying candle returns the same boolean; alert
idempotency belongs to the caller. The function does not send messages or orders.
The analyzer supplies closed history and ATR14 to the Demo risk manager.

`RunTradingAssistant` is a Nest injectable lifecycle service. It polls every
minute after each completed run and waits until second10 at an hour boundary.
It requires the newest row to be in the forming bucket, evaluates index -2,
and excludes the forming candle from every indicator. A cached closed-only
response fails closed instead of accidentally evaluating the wrong index.

BUYs enter the existing Demo manager in experimental mode, honoring entry
pause/start flags and portfolio limits. RiskManagerService defines structural
SL and a 2R target; v7 is retained only as a historical policy, not a second live entry rule.
Actual next-open fill rebasing and net-cost checks remain in the Demo manager.
There is one live entry strategy and one automated entry owner: the runner.
Signals API and technical-analysis API share MarketAnalysisService,
including15-second snapshot caching and concurrent-request coalescing. The runner
covers all active1h assets. The Demo scheduler synchronizes data and exits every minute; intrahour 1m
telemetry never changes the hourly indicator window.
Historical evaluation calls evaluateClosedMarket using the same199-bar window.
CCXT positions use version `ccxt-ema50-rsi14-v1` and static SL/TP exits; v7's
profit protection/time-exit policy is not silently applied to them.

The ledger's `CCXT_SIGNAL_COMMITTED` marker is unique for symbol/timeframe/
closed-candle timestamp. It is committed with the position and pending Telegram
notification; rolled-back or rejected entries are not marked. No memory Set or
empty Telegram stub remains. All entry producers share a PostgreSQL portfolio
advisory lock during capacity/balance checks and commit.

Apply `operations/migrations/20261005-ccxt-alert-payload.sql` before startup. Notification
payload stores the exact reason and forming-price snapshot durably. That price
is OHLCV's latest available close, not a guaranteed live tick, and never affects
signal conditions. Telegram transport remains at-least-once, not exactly-once.

`GET /trading-assistant/status` exposes live database check health, lastReason,
lastDemoReason and the persistent queue transport. Shutdown clears timers and
awaits the in-flight demo transaction. This implementation does not place orders
or establish profitability.
