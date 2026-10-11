# CCXT and closed 4h analysis

```ts
import { analyzeMarket } from './src/production/trading/ccxt/analyze-market';
const result = await analyzeMarket('BTC/EUR', '4h');
```

One cached Kraken CCXT client uses public OHLCV, rate limiting and a 15-second
request timeout. Entry is 4h with a separate mandatory daily EMA200 macro. Request720 rows for each, require the current4h
forming bucket, evaluate the newest closed row, and exclude forming data before
4h EMA20/50/ATR14 and daily EMA200. Invalid, duplicate, unaligned, gapped or stale data blocks
entry. `evaluateClosedMarket` is the common live/replay implementation.

`MarketAnalysisService` maps normalized crypto/EUR symbols and the dynamic top30 watchlist, coalesces simultaneous reads
and caches valid snapshots for 15 seconds. `RunTradingAssistant` polls every
minute, waits until second 10 of a new 4h bucket, and owns automated submission.
Repeated qualifying reads are deduplicated through committed database markers.
There is no RSI condition or second active strategy.

The snapshot is converted to a risk-bearing Maker-only signal. Demo reads the
public Kraken best bid/ask separately to reject crossed post-only entry limits.
This quote is execution admission, not an alternative signal engine. The data
scheduler syncs closed4h execution and daily macro bars and reconciles pending fills/exits every minute,
even when entry switches are off but a commitment remains.

No private Kraken API or exchange-order submission exists. Post-only semantics
are described in [Kraken's Add Order documentation](https://docs-legacy.kraken.com/api/docs/websocket-v2/add_order/).
Candle trade-through remains a fill proxy, not proof of queue priority or actual
Maker execution. See [the strategy](STRATEGY.md) for 24h limit expiry, stop non-fill,
fixed 0.40% fees and the +1.5R entry+0.85% protective stop.
