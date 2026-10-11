# Spot risk and execution policy

The current multi-timeframe basket strategy is BUY-only, with no leverage, 4h decisions with mandatory closed Daily EMA200 macro,
three filled open positions, 1% available-cash risk budgeting and an
EUR100 spend cap per order. SL is the lower of the last-ten low and 2ATR below
entry; initial TP is 2R. At +1.5R observed on a closed bar, the effective stop
moves to entry×1.0085 for later bars only.

Maker-only is a price/liquidity constraint, not a guaranteed protective exit.
A stop breach arms a passive sell limit; a continued fall can leave the asset
unsold. There is no market fallback and no guaranteed maximum 1R loss. This
consequence is represented explicitly by pending stop limits and open assets.
Kraken's [post-only documentation](https://docs-legacy.kraken.com/api/docs/websocket-v2/add_order/)
describes passive submission; ordinary limit orders alone do not ensure Maker.
Native stop-limit order types are not assumed to support the same post-only
modifier. The Demo models synthetic stop-triggered passive limit intentions.

Fixed Maker fee is 0.40% per side, including protected stop exits. Zero price slippage
in a passive-fill proxy does not eliminate spread, queue, opportunity or adverse
selection costs. No lower tier is inferred from unknown account volume.
OHLC cannot validate actual liquidity/partial fills; approval blocks proxies.

Data gaps retain unresolved capital/positions rather than invent fills. Default
research uses the fixed requested period and causal daily top30 liquidity selection. Remaining open assets are marked, not sold; their future exit fees are
not deducted. Realized EUR P/L, marked equity and cumulative R are distinct.
Monthly targets must be assessed on valid coverage and later independent data.

Existing rows retain their initial levels and cost basis, but prospective
Demo exits follow Maker-only rules at their recorded execution timeframe. Old minute/market/time-exit
implementations were removed. This application does not submit exchange orders.
