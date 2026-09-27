# Current Strategy: Experimental Hourly Trend Pullback

## Status

`exploratory-hourly-trend-pullback-v1` is an **experimental forward-Demo rule**.
It is not an approved or proven profitable strategy, and it must never place a
real exchange order. Its purpose is to produce consistent forward observations:
automatic virtual entries, exits, Telegram notifications, and database records.

## Market and execution scope

- Exchange data: Kraken Spot OHLCV candles.
- Symbols: `BTCEUR` and `ETHEUR` only.
- Signal timeframe: `1h`.
- Direction: long-only Spot (`BUY`); it never opens a short position.
- Entry model: the next hourly candle's open after a completed signal candle.
- Concurrent virtual positions: at most one (`MAX_DEMO_OPEN_POSITIONS=1`).

## Entry conditions

All conditions must be true on a fully closed hourly candle:

1. At least 200 hourly candles are available.
2. Current close is above the 200-hour SMA.
3. The preceding candle's low touched or went below the 20-hour EMA.
4. The current close resumed above the 20-hour EMA.
5. RSI(14) is between 45 and 65, avoiding both weak and already-extended moves.
6. The next candle's open remains between the planned stop-loss and take-profit.

If any condition is false, the result is `NO_TRADE`.

## Risk and exit rules

- ATR period: 14 candles.
- Stop-loss: calculated from recent structure and ATR by `RiskManagerService`.
- Take-profit: 2R, where `R` is the distance from entry to stop-loss.
- Intrabar ambiguity: if stop-loss and take-profit are both touched in one OHLC
  candle, the Demo records the conservative stop-loss outcome.
- Maximum holding period: 24 completed hourly candles.
- If neither stop nor target is touched by then, the position is closed at the
  closing price of the 24th candle (`TIME_EXIT`).

## Demo lifecycle

```text
closed candle → technical conditions → virtual BUY at next open
→ Telegram OPEN → SL / TP / TIME_EXIT monitoring
→ Telegram WIN or LOSS → demo_position database record
```

The Demo uses a fixed EUR amount (`DEMO_POSITION_SIZE_EUR`), records entry and
exit fees, and reports net EUR P/L. It never sends an order to Kraken.

`DEMO_TRADING_ENABLED` remains `false`. The rule runs only because
`EXPLORATORY_DEMO_ENABLED=true`; every resulting position is labelled
`EXPERIMENTAL` in the database.

## Interpretation

This rule has not passed a historical admission process on Kraken data. Its
forward results are therefore research observations—not evidence of an edge,
investment advice, or a reason to trade with real capital. Review a sufficiently
long, uninterrupted forward-Demo sample before making any decision about a
future strategy.
