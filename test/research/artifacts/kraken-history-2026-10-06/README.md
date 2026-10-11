# Current official Kraken basket replay

Only `current-analysis.json` is the full active report. Raw source data is retained.
Strategy: `spot-4h-pullback-daily-ema200-basket-v3`; 4h entries/exits, Daily EMA200.

The existing five hourly files and their original receipt are prior source data.
`eur-universe/` contains CRC-verified complete daily EUR files, historical 4h
sources, and `liquidity-selection.json`. The downloader scans 648 daily EUR
markets; 159 non-fiat/stablecoin markets existed during the requested period.
The replay selects 30 each UTC day from only the previous completed day's
close×volume. This is a turnover proxy, not exact historical24h VWAP/depth.
Source gaps documented as no-trade by the complete archive cannot fill orders;
unverified gaps still freeze exposure. No candles are fabricated. ZIP entry
CRC and file SHA are checked; the entire multipart ZIP SHA is not verified.

```sh
pnpm build:test
pnpm backtest:spot-basket --data-dir test/research/artifacts/kraken-history-2026-10-06/eur-universe --start 2021-12-21T16:00:00Z --end 2022-05-26T20:00:00Z --output test/research/artifacts/kraken-history-2026-10-06/current-analysis.json
```

To obtain/reverify sources with the maintained downloader:

```sh
python3 test/research/scripts/download-kraken-archive.py --output-dir test/research/artifacts/kraken-history-2026-10-06/eur-universe --rank-before 2021-12-21T16:00:00Z --through 2022-05-26T20:00:00Z
```

Exactly 937 4h steps, December21 2021 16UTC–May26 2022 20UTC, EUR1000 initial
shared capital. Daily pre-period history warms EMA200; primary warmup starts
inside the period. Fixed0.40% Maker fees per side, max6 filled OPEN positions,
pending TTL24h and entry+0.85% protection after1.5R. No protected latest year.

46filled BUYs,41closed,14wins/27losses,34.15% win rate. Average9 BUYs per full
calendar month: Jan15,Feb9,Mar1,Apr11. Realized P/L−EUR52.13; marked final equity
EUR760.03 (−EUR239.97/−24.00%), max close drawdown28.65%. Five positions remain
open; four stop sells remain unfilled. There are zero unknown gaps and five
verified empty intervals involving exposure. Targets are not achieved.

No forced final liquidation, DB writes, messages or real orders. Maker OHLC
trade-through cannot verify queue priority, partial fills or spread; reports
cannot approve production execution. Code/source SHA provenance is included.

See [the current evaluation](../../../../docs/CURRENT_EVALUATION.md).
