# Operating protocol

One active entry strategy: `spot-4h-pullback-daily-ema200-basket-v4`, a dynamic top30 crypto/EUR watchlist and closed4h analysis and closed1h execution with mandatory closed Daily EMA200 macro. Production imports neither research
nor operations. Current replay, checks and raw datasets belong under test;
maintenance/import commands belong under operations.

Use one service instance, secrets in .env and DB_SYNCHRONIZE=false. The pending
Maker queue reuses existing alert_delivery varchar actions and JSON payload;
apply the existing payload migration if the database lacks that column. Apply the executionTimeframe and stopExecutionPolicy migrations for v4. Source cleanup never deletes rows.

RunTradingAssistant owns automated submissions. Demo scheduler syncs/reconciles
pending orders and existing positions, independent of entry enable switches.
Pause new admission with DEMO_ENTRIES_PAUSED. Asset catalogue CRUD is metadata;
changing the fixed basket requires changing trading-symbol.ts.

New entry/TP intentions are limit/post-only. User-selected new stops use MARKET_STOP
with fee 0.004 and adverse slippage 0.001; old accepted snapshots retain Maker exits. Cash is reserved before simulated fill for at most24h; capacity counts filled open positions only. Missing
history does not prove expiry or exit. SL/TP, initial risk and entry costs remain
immutable on existing positions; effective entry+0.85% protective-stop state is reconstructed causally.
Telegram outbox remains at-least-once; real exchange orders are not implemented.

The monthly goal is >=10 profitable BUYs, measured by the replay report, never
promised by indicators. OHLC reports are not verified Maker fill evidence and do
not enable APPROVED entries. The protected latest year stays excluded by default.
The read-only research portfolio API can explicitly include it with
?includeHoldout=true; such evaluation is separate from ordinary selection work.

After changes, run appropriate typechecks, build, tests and check:structure.
Keep one current entry implementation, one current report and meaningful tests.
Remove failed candidate scripts/reports and unused methods/imports/empty folders;
retain raw datasets and a concise diagnostic history in CURRENT_EVALUATION.md.
