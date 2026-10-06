# Historical replay — 2026-10-06

Strategy: `ccxt-ema50-rsi14-v1`, unchanged production EMA50/RSI14 rule.
Official Kraken 2026Q2 archive; CSVs extend through 2026-06-30 23:00 UTC.
Evaluation covers 2020-01-01 through 2025-10-06 06:00 UTC. The protected
holdout begins 2025-10-06 07:45:12 UTC and was not evaluated.

| Market | Evaluated bars | BUY / closed trades | Wins | Losses | Net R | Profit factor |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| BTC/EUR | 50,002 | 9 | 3 | 6 | -0.6102 | 0.9051 |
| ETH/EUR | 49,952 | 6 | 1 | 5 | -3.3495 | 0.3741 |

Fees and slippage are each 0.05% per side. R is the engine's risk-normalized
result, not a EUR account return. These are independent market replays, not
a shared-capital portfolio simulation. The sparse sample and negative net
results do not establish profitability. Validation was negative for both
markets; the test period contains only one closed trade per market.

Missing hourly bars split BTC into 11 continuous segments and ETH into 12.
No gap candles or boundary exits were fabricated. Each signal uses at most
199 closed bars, matching the live window. ZIP member CRCs were verified;
the entire multipart archive SHA256 was not verified.

`backtest.json` contains full trades, period summaries, gap details, CSV
SHA256 values and engine metadata. `download-receipt.json` records source
URLs; its extraction paths refer to the original temporary download location.
The CSVs are also preserved here for reruns.

```sh
pnpm build:test
pnpm backtest:kraken-csv --btc test/research/artifacts/kraken-history-2026-10-06/BTCEUR_60.csv --eth test/research/artifacts/kraken-history-2026-10-06/ETHEUR_60.csv --output /private/tmp/kraken-backtest-rerun.json
```

The holdout cutoff depends on execution time, so later reruns can include
additional selection bars. No database writes, Telegram messages or real
orders occurred. TypeScript checking and production build passed.

After the structure cleanup, a second replay matched every signal count,
individual trade and sequential result. See `cleanup-validation.json` for
the recorded comparison. Six compatibility checks and offline bootstrap of
both production and research passed; production loads no research engine.

The subsequent controller/service cleanup passed eight checks, including the
actual 19-route production inventory and closed-only manual sync. Replaying
with the original reference clock preserved every signal count, trade and
sequential result again. See `controller-cleanup-validation.json`.
