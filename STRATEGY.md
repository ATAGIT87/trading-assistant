# Current Strategy: Experimental Hourly Breakout

## Status

`exploratory-hourly-breakout-v1` is an **experimental forward-Demo rule**.
It is not an approved or proven profitable strategy, and it must never place a
real exchange order. Its purpose is to produce consistent forward observations:
automatic virtual entries, exits, Telegram notifications, and database records.

## Market and execution scope

- Exchange data: Binance Spot OHLCV candles.
- Symbols: `BTCUSDT` and `ETHUSDT` only.
- Signal timeframe: `1h`.
- Direction: long-only Spot (`BUY`); it never opens a short position.
- Entry model: the next hourly candle's open after a completed signal candle.
- Concurrent virtual positions: at most one (`MAX_DEMO_OPEN_POSITIONS=1`).

## Entry conditions

All conditions must be true on a fully closed hourly candle:

1. At least 200 hourly candles are available.
2. Current close is above the 200-hour SMA.
3. Current close is above the high of the preceding 20 candles.
4. Current volume is above the average volume of the preceding 20 candles.
5. The next candle's open remains between the planned stop-loss and take-profit.

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

`DEMO_TRADING_ENABLED` remains `false`. The rule runs only because
`EXPLORATORY_DEMO_ENABLED=true`; every resulting position is labelled
`EXPERIMENTAL` in the database.

## Interpretation

The rule previously failed the historical admission gates, so forward results
are research observations—not evidence of an edge, investment advice, or a
reason to trade with real capital. Review a sufficiently long, uninterrupted
forward-Demo sample before making any decision about a future strategy.
