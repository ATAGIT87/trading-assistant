Trading Assistant — Project Progress

🎯 Project Goal

Build a personal trading assistant that continuously analyzes financial markets and identifies only strong trading opportunities.

The application should:

* Analyze market data periodically.
* Detect strong BUY / SELL setups.
* Return WAIT / NO TRADE when the setup is not strong enough.
* Provide a confidence score based on transparent rules.
* Eventually include Entry, Stop Loss, Take Profit and Risk/Reward.
* Eventually combine technical indicators with multi-timeframe analysis, volatility, news and fundamental data.
* Store signals and their outcomes.
* Support backtesting to evaluate whether the strategy actually works.
* Never execute trades automatically. The final trading decision remains with the user.

Important: Confidence is a rule-based score, not a probability of success.

⸻

🛠️ Tech Stack

* NestJS
* TypeScript
* PostgreSQL
* TypeORM
* pnpm
* VS Code
* VS Code REST Client

⸻

✅ Completed Work

1. Project Setup

* Created NestJS project.
* Configured PostgreSQL.
* Configured TypeORM.
* Added global request validation using ValidationPipe.
* Configured whitelist and forbidNonWhitelisted.
* Set up REST API testing with VS Code REST Client.

⸻

2. Assets Module

Created the Assets module with CRUD operations.

Endpoints

POST   /assets
GET    /assets
GET    /assets/active
GET    /assets/:id
PATCH  /assets/:id
DELETE /assets/:id

Asset properties

id
symbol
name
type
isActive
timeframe

Asset Types

FOREX
CRYPTO
STOCK
INDEX
COMMODITY

Supported Timeframes

15m
1h
4h
1d

⸻

3. Market Data Module

Created the MarketData module.

Market candles contain:

symbol
timeframe
time
open
high
low
close
volume

Added a unique constraint for:

symbol + timeframe + time

This prevents duplicate candles.

Also added:

* Create candle
* Get all candles
* Get candles by symbol
* Get candles by symbol + timeframe
* Get latest candle
* Get latest price

⸻

4. Market Data Seed

Created a seed for test market data.

Currently using BTCUSD test candles so that indicators and signals can be developed without an external market-data API.

⸻

📊 5. Indicators Module

Created the Indicators module.

Implemented:

SMA

Simple Moving Average.

EMA

Exponential Moving Average.

RSI

Relative Strength Index.

Price comparison

Compare current price with:

SMA
EMA

Possible results:

ABOVE
BELOW
EQUAL

Trend detection

Based on price relative to SMA and EMA:

Price > SMA + Price > EMA
→ BULLISH
Price < SMA + Price < EMA
→ BEARISH
Otherwise
→ NEUTRAL

RSI classification

RSI < 30
→ OVERSOLD
RSI > 70
→ OVERBOUGHT
Otherwise
→ NEUTRAL

Market condition

Current rules:

BEARISH + OVERSOLD
→ POSSIBLE_REVERSAL
BEARISH + NEUTRAL
→ BEARISH_CONTINUATION
BULLISH + OVERBOUGHT
→ POSSIBLE_REVERSAL
BULLISH + NEUTRAL
→ BULLISH_CONTINUATION
Otherwise
→ NEUTRAL

⸻

📈 6. Signals Module

Created the Signals module.

Current signal logic:

BULLISH_CONTINUATION
→ BUY
BEARISH_CONTINUATION
→ SELL
POSSIBLE_REVERSAL
→ WAIT
NEUTRAL
→ WAIT

Current endpoint:

GET /signals/:symbol/:timeframe/:period

Example:

GET /signals/BTCUSD/1h/14

⸻

🎯 7. Confidence Score

Added a rule-based confidence score from 0 to 100.

Current scoring:

Trend

BULLISH → +40
BEARISH → +40
NEUTRAL → +0

SMA / EMA Alignment

Price ABOVE SMA + ABOVE EMA → +40
Price BELOW SMA + BELOW EMA → +40
One of them EQUAL → +20
Conflicting alignment → +0

RSI

NEUTRAL → +20
OVERBOUGHT → +10
OVERSOLD → +10

Total:

Trend             40
SMA/EMA alignment 40
RSI               20
---------------------
Maximum          100

⸻

🧪 Current Test Result

For:

BTCUSD
Timeframe: 1h
RSI Period: 14

Current result:

Action:          SELL
Confidence:      100
Trend:           BEARISH
RSI:             46.43
RSI Status:      NEUTRAL
Market Condition: BEARISH_CONTINUATION

This confirms that the current signal pipeline is working.

⸻

⚠️ Important Current Limitations

The current system is still a prototype.

Confidence 100 does NOT mean a 100% probability of success.

It currently only means:

All currently implemented rule-based conditions are aligned.

The strategy has not yet been validated with historical backtesting.

Also, the current RSI implementation is a simplified calculation and may later need to be replaced/improved with standard Wilder RSI.

⸻

🚧 Next Development Goal

The next important step is to define what counts as a Strong Setup.

The system should eventually avoid producing actionable BUY/SELL signals for weak setups.

Example concept:

Confidence < threshold
→ NO TRADE
Strong setup
→ BUY / SELL

The exact threshold should eventually be validated through backtesting rather than chosen arbitrarily.

⸻

🧠 Development Principle

Build the system step-by-step.

Do not implement large changes at once.

Every new part should be:

1. Understandable
2. Testable
3. Small
4. Based on explicit rules
5. Eventually validated with historical data

The goal is not to make the system generate many signals.

The goal is to find few, high-quality trading setups and confidently say:

NO TRADE

when the market conditions are not good enough.