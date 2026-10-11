# Active 4h spot strategy

`spot-4h-pullback-daily-ema200-basket-v4` is the sole entry implementation.
The application implements engineering Demo execution, not real exchange orders.

## Trend and entry

The mandatory macro filter uses at least 200 completed **daily** candles.
Daily close and the latest closed 4h price must be strictly above Daily EMA200.
Daily EMA200 is deliberately different from the previous 4h EMA200 proxy.
The 4h bullish reversal must touch/dip below its EMA20 or EMA50 and close above
that EMA. RSI is not an entry requirement. Closed 4h ATR14 and the lowest low
of the last 10 4h bars produce SL=min(structural low,entry−2ATR). New orders
keep this structural SL and calculate TP at 2R from the actual passive entry.
A lower quote must not leave the signal-close TP stretched beyond 2R. The
net-target fee gate runs after rebasing; persisted orders/positions retain
their accepted levels.

CCXT fetches separate 4h and daily series, rejects malformed/gapped/stale data
and excludes forming candles. The latest 4h bucket must be present before its
predecessor can generate a signal. At most 719 closed bars seed each series.
Replay calls the same production evaluator with independent official daily
history; future daily bars never affect an earlier decision.

## Dynamic watchlist and capacity

Live selection ranks online Kraken crypto/EUR spot pairs by 24h base volume
multiplied by 24h VWAP, selects the top 30, and refreshes every 24 hours.
Fiat and listed fiat stablecoins are excluded. XBT/XDG aliases normalize to
BTC/DOGE. The bootstrap snapshot is informational: automated new entries need
a successful refresh. Refresh failure cannot stop accepted-order/exit monitoring.
Volume turnover is a liquidity proxy; order-book depth and spread are not ranked.
Current market availability determines membership; historical MATIC is not
silently substituted with POL. Pair normalization supports EUR symbols beyond
the watchlist so stored positions remain manageable after rotation.

Six **filled OPEN positions** is the shared portfolio cap. Pending BUYs do not
consume slots but reserve capital including entry fees, and one commitment per
asset is allowed. A fill rechecks capacity under the portfolio lock. Demo retains
its <=1% available-cash risk and <=EUR100 invested per order. Historical fills
use only slots available at bar start, never capital or slots from later exits.

Pending order expiry is exactly 24 hours after submission. Signal candles stay
4h; current Demo execution uses independent closed 1h candles. The partial
placement hour is excluded; submission at second10 permits 23 full subsequent
hourly observations. Existing positions retain their stored execution timeframe. Confirmed macro reversal cancels
an unfilled entry. Unknown fill history remains quarantined rather than assuming
an order expired safely. Accepted old entries preserve their original deadline
and macro/timeframe compatibility. Rotation never liquidates open positions.

## Maker execution and protection

New BUY and TP intentions remain limit/post-only. New signal snapshots carry
`stopExecutionPolicy=MARKET_STOP`, persisted on the filled position. Null/absent
policy preserves legacy Maker stop-limit exits; prior accepted snapshots keep
initial risk levels and cost basis. Apply the stop-policy column migration before
running v4. The strategy and evidence-engine versions changed so v3 evidence
cannot approve the new execution rules.

Demo models Maker fees at 0.40%, stop taker fees at 0.40%, and adverse stop
slippage at 0.10%. These are explicit assumptions, not measured execution costs.
A stop crosses at min(bar open, effective stop), then applies adverse slippage;
price gaps do not receive an unavailable stop price. TP stays a passive fill.
For ambiguous OHLC bars, stop takes precedence over TP. Slippage is included in
the exit price and recorded separately without subtracting it twice from P/L.
Position sizing includes stop slippage; a gap may still exceed planned risk.

Protection arms after a completed bar reaches +1.5 initial R, for later bars
only. The new cushion is derived from entry fee, stop fee and stop slippage,
plus 0.01% buffer (about 0.914%). Legacy Maker positions retain +0.85% protection
and their delayed passive stop behavior. No guaranteed break-even is asserted.

Execution remains a closed-candle Demo proxy: even market-stop results are
observed after the hour closes. No real exchange order or native stop is placed;
this is not a live tick-level immediate exit. Maker queue position, spreads,
partial fills and actual stop slippage cannot be established from OHLC alone.

## Historical evaluation and evidence

The saved detached replay covers 2021-12-21 16:00UTC–2022-05-26 20:00UTC.
Its daily watchlist ranks only the previous completed UTC day's close×volume
across markets already trading at that time. This is a causal historical volume
proxy, not exact rolling-24h VWAP or historical order-book depth. Daily source
history before the period warms EMA200; trades/returns begin within the requested
period after 50 closed 4h bars. Newly listed assets cannot buy before Daily EMA200
is available. The latest protected year is excluded.

Official complete CRC/SHA-verified OHLCVT files omit no-trade intervals. Such
verified intervals cannot fill orders or update stops; no artificial candles
are inserted. Unverified gaps still freeze exposed positions. Indicators require
continuous actual candles; a no-trade gap resets primary history. Marks use the
latest actual close, and no forced liquidation is performed at the period end.
See [Kraken's data definition](https://support.kraken.com/articles/360047124832-downloadable-historical-ohlcvt-open-high-low-close-volume-trades-data).

Only one current full report is kept. Engine `spot-maker-daily-4h-basket-v3`
reports makerFillsValidated=false and does not write DB evidence, messages or
orders. APPROVED requires current validated 4h Maker evidence, fixed fees,
separate protected holdout and sufficient trades/contributing markets. The
monthly frequency/profit targets are measured, not guaranteed.
