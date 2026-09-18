# Trading Assistant — Project Protocol

## English Version

### 1. Project Status

- **Phase:** Phase 1 — Technical Trading Assistant
- **Status:** Validated and Frozen
- **Execution:** Manual alerts only
- **Automatic trade execution:** Not implemented
- **Phase 1 completion:** approximately 95%
- **Technical pipeline confidence:** approximately 85%
- **Trading win probability:** not represented by the system confidence score and cannot be inferred from the completion percentage.

---

## 2. Purpose

The Trading Assistant is a NestJS/TypeScript backend that analyzes cryptocurrency market data and produces technical trading alerts.

The current architecture is:

```text
Binance
  ↓
Market Data
  ↓
PostgreSQL
  ↓
Indicators
  ↓
Signal Engine
  ↓
Higher Timeframe Confirmation
  ↓
Risk Management
  ↓
Signal Storage
  ↓
Scanner
  ↓
Telegram
```

The system is a technical decision-support and alerting system. It does not automatically place trades.

---

## 3. Technology Stack

- NestJS 11
- TypeScript
- Node.js 24
- PostgreSQL
- TypeORM
- pnpm
- Zod
- Jest
- Supertest
- Binance API
- Telegram Bot API

---

## 4. Market Data

The provider retrieves historical candles from Binance.

Current symbol mapping includes:

```text
BTCUSD → BTCUSDT
ETHUSD → ETHUSDT
```

Current timeframe support:

```text
15m
1h
4h
1d
```

The current provider supports BTCUSD and ETHUSD. SOLUSD is currently unsupported.

Candles are stored in PostgreSQL with uniqueness based on:

```text
symbol + timeframe + time
```

This prevents duplicate candles.

---

## 5. Indicators

The system calculates:

- SMA 14
- EMA 14
- RSI 14
- ATR 14
- ADX 14

Derived technical values include:

- Price vs SMA
- Price vs EMA
- SMA vs EMA
- Trend
- RSI Status
- Market Condition

The indicator implementation was validated against the `technicalindicators` library. Numerical differences were effectively zero or negligible.

---

## 6. Trend

Trend states are:

```text
BULLISH
BEARISH
NEUTRAL
```

The trend is derived primarily from price positioning relative to SMA and EMA.

Typical interpretation:

```text
Price above SMA and EMA → BULLISH
Price below SMA and EMA → BEARISH
Otherwise                → NEUTRAL
```

---

## 7. RSI and Market Condition

RSI is classified into states such as:

```text
OVERSOLD
NEUTRAL
OVERBOUGHT
```

RSI alone never creates a BUY or SELL.

Trend and RSI are combined into market conditions.

Examples:

```text
BULLISH + NEUTRAL    → BULLISH_CONTINUATION
BEARISH + NEUTRAL    → BEARISH_CONTINUATION
BULLISH + OVERBOUGHT → POSSIBLE_REVERSAL
BEARISH + OVERSOLD   → POSSIBLE_REVERSAL
```

A possible reversal does not automatically create a trade.

---

## 8. Signal Scoring

The signal score combines:

```text
Trend Score
+ Average Alignment Score
+ RSI Score
+ Market Condition Score
+ ADX Score
```

The score is capped at 100.

A strong setup requires:

```text
confidence >= 75
```

### Important meaning of confidence

`confidence` is a rule-based score, not a statistical probability.

For example:

```text
confidence = 95
```

does **not** mean:

```text
95% probability of profit
```

It means that the current technical rules produced a score of 95/100.

---

## 9. Signal Actions

Possible actions:

```text
BUY
SELL
WAIT
NO_TRADE
```

### BUY

BUY requires the technical filters to pass, including:

- Strong setup
- Bullish trend
- ADX >= 25
- ATR > 0
- Higher timeframe confirmation
- No contradictory continuation condition

The final actionable bullish condition is associated with `BULLISH_CONTINUATION`.

### SELL

SELL requires the equivalent bearish conditions:

- Strong setup
- Bearish trend
- ADX >= 25
- ATR > 0
- Higher timeframe confirmation
- No contradictory continuation condition

The final actionable bearish condition is associated with `BEARISH_CONTINUATION`.

### NO_TRADE

`NO_TRADE` is an intentional risk filter, not an error.

It can occur when:

- confidence < 75
- trend is NEUTRAL
- ADX < 25
- ATR <= 0
- lower and higher timeframe trends disagree
- a contradictory continuation condition exists

### WAIT

`WAIT` means the setup is not currently actionable as BUY or SELL under the final action rules.

---

## 10. Multi-Timeframe Confirmation

Current higher-timeframe mapping:

```text
15m → 1h
1h  → 4h
4h  → 1d
```

Example:

```text
15m = BULLISH
1h  = BULLISH
```

is aligned.

But:

```text
15m = BULLISH
1h  = BEARISH
```

is a contradiction and the trade is rejected.

### Validated real example

A scanner result produced:

```text
Trend: BULLISH
Higher Timeframe Trend: BEARISH
RSI: 72.15
ADX: 45.14
Market Condition: POSSIBLE_REVERSAL
Confidence: 95
Action: NO_TRADE
```

The reason was the higher-timeframe mismatch.

This proves that a high score alone does not force a trade.

---

## 11. Risk Management

For actionable BUY/SELL signals:

```text
Stop Loss = 1.5 × ATR
R = absolute distance between Entry and Stop Loss
Take Profit = 2R
```

Target risk/reward:

```text
1 : 2
```

Example:

```text
Entry = 100
ATR = 2
SL distance = 3
BUY SL = 97
BUY TP = 106
```

The SELL calculation is mirrored.

---

## 12. Signal Storage

Signals are stored in PostgreSQL.

Before saving, the system checks:

```text
symbol + timeframe + candleTime
```

If a signal already exists for that candle, another signal is not stored.

This also supports duplicate-alert prevention in the scanner.

---

## 13. Backtesting

The backtesting engine:

1. Loads historical candles.
2. Splits the data approximately 70/30 into training and test sections.
3. Uses the actual signal engine.
4. Simulates trade outcomes.
5. Calculates R results and statistics.
6. Returns summary and individual trades.

Current risk model:

```text
SL = 1.5 ATR
TP = 2R
```

Current backtest assumptions:

```text
Fee = 0
Slippage = 0
```

Therefore realistic exchange fees and slippage are still a future improvement.

### Conservative same-candle rule

If a candle reaches both SL and TP and candle-level data cannot establish which happened first, the backtester treats the result conservatively as `OPEN`.

This avoids artificially improving results.

---

## 14. Latest Backtest Validation

Validated ETHUSD 15m backtest:

```text
Trades:       328
Wins:         115
Losses:       211
Win Rate:     35.28%
Total R:      +19R
Expectancy:   +0.058R/trade
```

The summary values were compared with the individual trades and matched.

These are historical validation results only. They are not a guarantee of future profitability.

---

## 15. Scanner

The scanner is responsible for operational signal generation.

Scheduled scan:

```text
Every 15 minutes
```

Scheduled timeframes:

```text
15m
1h
```

For 15m scans:

```text
Sync 1h
Sync 15m
```

For 1h scans:

```text
Sync 1h
Build 4h candles
```

The scanner checks market-data freshness.

Maximum accepted age is approximately:

```text
2 × timeframe duration
```

Stale data is skipped.

Before generating a signal, the scanner checks whether a signal already exists for the latest candle.

This prevents repeated alerts.

Only BUY and SELL signals are sent to Telegram.

---

## 16. Telegram Alerts

Telegram is an alert channel, not a trading execution channel.

Telegram configuration:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

The alert contains:

- Action
- Symbol
- Timeframe
- Confidence
- Entry
- Stop Loss
- Take Profit
- Trend
- RSI
- ADX
- Market Condition
- Reason

Telegram alerts are sent only for:

```text
BUY
SELL
```

No alert is sent for:

```text
WAIT
NO_TRADE
```

The real Telegram Bot API was tested successfully with the project's `.env` configuration, and the test message was received.

---

## 17. API Validation

Zod schemas are used for API response validation.

Validated areas include:

- Signal response
- Scanner response
- Backtest response

The Signal and Scanner endpoints also parse numeric URL parameters correctly.

This protects the API from silently returning unexpected response structures.

---

## 18. Testing and Validation

The project was validated with:

```bash
pnpm test
pnpm run build
pnpm exec ts-node --require reflect-metadata test/app.e2e-spec.ts
```

The final validation included:

```text
Unit Tests        ✅
Build             ✅
E2E               ✅
Indicator check   ✅
Signal validation ✅
Scanner validation ✅
Backtest validation ✅
Telegram API      ✅
```

Phase 1 is therefore considered validated and frozen.

---

## 19. Current Alert Meaning

### BUY

The technical model currently considers the setup actionable on the selected timeframe. Required technical filters and higher-timeframe confirmation have passed, and SL/TP have been calculated.

### SELL

The technical model currently considers the bearish setup actionable. Required filters and higher-timeframe confirmation have passed, and SL/TP have been calculated.

### NO_TRADE

The system deliberately rejected the setup because at least one required filter failed.

### WAIT

The setup is not currently actionable according to the final action rules.

---

## 20. Project Completion

Current Phase 1 components:

```text
Market Data             ✅
Indicators              ✅
Signal Engine           ✅
Risk Management         ✅
Multi-Timeframe         ✅
Backtesting             ✅
Strategy Validation     ✅
Signal Storage          ✅
Scanner                 ✅
Telegram Alerts         ✅
Zod API Validation      ✅
Unit Tests              ✅
Build                   ✅
E2E                     ✅
Final Validation        ✅
```

Estimated Phase 1 completion:

```text
≈ 95%
```

The remaining work is mainly production hardening, broader validation, realistic fees/slippage, additional assets, monitoring, and future functionality.

---

## 21. Reliability Assessment

There are two separate concepts.

### Software / Pipeline Reliability

The current technical pipeline has been strongly validated.

A practical project-status estimate is:

```text
≈ 85% technical confidence
```

This reflects successful validation of:

- market-data retrieval
- indicator calculations
- signal calculation
- multi-timeframe checks
- risk calculations
- signal storage
- scanner behavior
- API validation
- backtesting
- Telegram delivery
- tests
- build
- E2E

### Trading Reliability

This number must **not** be interpreted as trading accuracy.

There is currently no calibrated probability model.

The validated ETHUSD 15m backtest showed:

```text
35.28% win rate
+19R total
+0.058R expectancy
```

on the tested historical dataset.

That does not prove the strategy will produce the same results in the future.

---

## 22. Known Limitations

1. Confidence is a rule score, not a calibrated probability.
2. Backtest fees are currently 0.
3. Backtest slippage is currently 0.
4. Current Binance provider supports only the currently mapped symbols.
5. The strategy needs broader validation across assets and market regimes.
6. Historical results do not guarantee future performance.
7. No automatic trade execution exists.
8. Telegram only delivers alerts.
9. Scheduler operation depends on correctly configured active assets.
10. Phase 2 news/fundamental analysis is not implemented.

---

## 23. Phase 2

Phase 2 is intentionally postponed.

Future direction:

```text
Technical Analysis
+
News
+
Fundamental Data
+
Market Context
```

Potential future inputs:

- News
- Economic events
- Fundamental metrics
- Market sentiment
- Macro indicators

Phase 1 should remain frozen while Phase 2 is developed.

---

## 24. Final Project Philosophy

The system answers:

> "What does the current technical model see?"

It does not answer:

> "Will this trade definitely make money?"

The intended workflow is:

```text
Technical Signal
+
Risk Information
+
Market Context
+
Human Decision
```

The user remains responsible for the final trading decision.

---

## 25. Phase 1 Freeze

Phase 1 is:

```text
VALIDATED
TESTED
BUILT
E2E VERIFIED
TELEGRAM VERIFIED
FROZEN
```

Any future change to the core signal rules should trigger a new validation and backtest cycle.

---

# نسخه فارسی

## 1. وضعیت پروژه

- **Phase:** Phase 1 — Technical Trading Assistant
- **وضعیت:** Validated و Frozen
- **نوع اجرا:** فقط Manual Alert
- **اجرای خودکار معامله:** وجود ندارد
- **درصد تکمیل Phase 1:** حدود 95٪
- **میزان اطمینان فنی به Pipeline:** حدود 85٪
- **احتمال برد معامله:** از این درصد قابل استنتاج نیست.

---

## 2. هدف پروژه

Trading Assistant یک Backend با NestJS و TypeScript است که داده‌های بازار ارز دیجیتال را دریافت و تحلیل می‌کند و Alert تکنیکال تولید می‌کند.

معماری فعلی:

```text
Binance
  ↓
Market Data
  ↓
PostgreSQL
  ↓
Indicators
  ↓
Signal Engine
  ↓
Higher Timeframe Confirmation
  ↓
Risk Management
  ↓
Signal Storage
  ↓
Scanner
  ↓
Telegram
```

این پروژه فعلاً یک سیستم تصمیم‌یار و Alerting است و خودش معامله انجام نمی‌دهد.

---

## 3. تکنولوژی‌ها

- NestJS 11
- TypeScript
- Node.js 24
- PostgreSQL
- TypeORM
- pnpm
- Zod
- Jest
- Supertest
- Binance API
- Telegram Bot API

---

## 4. Market Data

داده‌های تاریخی Candle از Binance دریافت می‌شوند.

Mapping فعلی:

```text
BTCUSD → BTCUSDT
ETHUSD → ETHUSDT
```

Timeframeهای فعلی:

```text
15m
1h
4h
1d
```

Provider فعلی از BTCUSD و ETHUSD پشتیبانی می‌کند.

`SOLUSD` فعلاً پشتیبانی نمی‌شود.

Candleها در PostgreSQL ذخیره می‌شوند و ترکیب زیر Unique است:

```text
symbol + timeframe + time
```

در نتیجه Duplicate Candle ذخیره نمی‌شود.

---

## 5. Indicatorها

سیستم این Indicatorها را محاسبه می‌کند:

```text
SMA 14
EMA 14
RSI 14
ATR 14
ADX 14
```

مقادیر مشتق‌شده:

```text
Price vs SMA
Price vs EMA
SMA vs EMA
Trend
RSI Status
Market Condition
```

محاسبات با `technicalindicators` مقایسه و Validate شدند و اختلاف‌ها عملاً صفر یا بسیار ناچیز بودند.

---

## 6. Trend

Trend می‌تواند:

```text
BULLISH
BEARISH
NEUTRAL
```

باشد.

به‌صورت کلی:

```text
Price بالای SMA و EMA → BULLISH
Price پایین SMA و EMA → BEARISH
در غیر این صورت       → NEUTRAL
```

---

## 7. RSI و Market Condition

RSI وضعیت‌هایی مثل:

```text
OVERSOLD
NEUTRAL
OVERBOUGHT
```

دارد.

RSI به‌تنهایی BUY یا SELL ایجاد نمی‌کند.

Trend و RSI برای تعیین Market Condition ترکیب می‌شوند.

مثلاً:

```text
BULLISH + NEUTRAL    → BULLISH_CONTINUATION
BEARISH + NEUTRAL    → BEARISH_CONTINUATION
BULLISH + OVERBOUGHT → POSSIBLE_REVERSAL
BEARISH + OVERSOLD   → POSSIBLE_REVERSAL
```

`POSSIBLE_REVERSAL` به‌تنهایی به معنی معامله نیست.

---

## 8. Signal Scoring

Score نهایی از ترکیب این موارد ساخته می‌شود:

```text
Trend Score
+ Average Alignment Score
+ RSI Score
+ Market Condition Score
+ ADX Score
```

حداکثر Score:

```text
100
```

Strong Setup:

```text
confidence >= 75
```

### معنی Confidence

`confidence` احتمال آماری نیست.

مثلاً:

```text
confidence = 95
```

یعنی:

> سیستم طبق Ruleهای فعلی 95 امتیاز از 100 گرفته است.

و **به هیچ وجه** یعنی:

```text
95% احتمال برد
```

نیست.

---

## 9. Actionها

خروجی‌های اصلی:

```text
BUY
SELL
WAIT
NO_TRADE
```

### BUY

شرایط اصلی:

```text
Strong Setup
+
BULLISH Trend
+
ADX >= 25
+
ATR > 0
+
Higher Timeframe Confirmation
+
No contradictory condition
```

### SELL

شرایط اصلی:

```text
Strong Setup
+
BEARISH Trend
+
ADX >= 25
+
ATR > 0
+
Higher Timeframe Confirmation
+
No contradictory condition
```

### NO_TRADE

`NO_TRADE` خطا نیست.

یک Risk Filter عمدی است.

مثلاً اگر:

```text
confidence < 75
```

یا:

```text
Trend = NEUTRAL
```

یا:

```text
ADX < 25
```

یا:

```text
ATR <= 0
```

یا:

```text
Lower Timeframe != Higher Timeframe
```

باشد، معامله رد می‌شود.

### WAIT

یعنی Setup فعلاً Actionable نیست و طبق Ruleهای نهایی BUY یا SELL نشده است.

---

## 10. Multi-Timeframe Confirmation

Mapping فعلی:

```text
15m → 1h
1h  → 4h
4h  → 1d
```

مثلاً:

```text
15m = BULLISH
1h  = BULLISH
```

هماهنگ است.

ولی:

```text
15m = BULLISH
1h  = BEARISH
```

تناقض است و معامله Reject می‌شود.

### نمونه واقعی Validate شده

یک Scanner Result:

```text
Trend: BULLISH
Higher Timeframe Trend: BEARISH
RSI: 72.15
ADX: 45.14
Market Condition: POSSIBLE_REVERSAL
Confidence: 95
Action: NO_TRADE
```

علت:

```text
Lower Timeframe = BULLISH
Higher Timeframe = BEARISH
```

پس حتی با Confidence برابر 95، معامله انجام نمی‌شود.

---

## 11. Risk Management

برای BUY و SELL:

```text
SL = 1.5 × ATR
```

Risk:

```text
R = فاصله Entry تا Stop Loss
```

Take Profit:

```text
TP = 2R
```

پس Target Risk/Reward:

```text
1 : 2
```

مثال:

```text
Entry = 100
ATR = 2
```

پس:

```text
SL distance = 3
BUY SL = 97
BUY TP = 106
```

برای SELL محاسبه برعکس می‌شود.

---

## 12. Signal Storage

Signalها در PostgreSQL ذخیره می‌شوند.

قبل از ذخیره:

```text
symbol + timeframe + candleTime
```

بررسی می‌شود.

اگر برای همان Candle Signal قبلاً وجود داشته باشد، دوباره ذخیره نمی‌شود.

این کار از Duplicate Alert هم جلوگیری می‌کند.

---

## 13. Backtesting

Backtesting Engine:

1. Candleهای تاریخی را می‌گیرد.
2. داده را تقریباً 70/30 تقسیم می‌کند.
3. از Signal Engine واقعی استفاده می‌کند.
4. نتیجه معامله را شبیه‌سازی می‌کند.
5. R و Statistics را محاسبه می‌کند.
6. Summary و Tradeهای جداگانه را برمی‌گرداند.

Risk Model:

```text
SL = 1.5 ATR
TP = 2R
```

در Backtest فعلی:

```text
Fee = 0
Slippage = 0
```

پس Fee و Slippage واقعی باید در نسخه‌های بعدی اضافه شوند.

### قانون Conservative

اگر یک Candle هم به SL و هم به TP برسد و از داده Candle مشخص نباشد کدام اول اتفاق افتاده، نتیجه `OPEN` در نظر گرفته می‌شود.

---

## 14. نتیجه Backtest نهایی Validate شده

برای:

```text
ETHUSD / 15m
```

نتیجه:

```text
Trades:       328
Wins:         115
Losses:       211
Win Rate:     35.28%
Total R:      +19R
Expectancy:   +0.058R/trade
```

Summary با Tradeهای تکی مقایسه شد و با آنها مطابقت داشت.

این اعداد فقط نتیجه تاریخی Dataset تست‌شده هستند و تضمین عملکرد آینده نیستند.

---

## 15. Scanner

Scanner مسئول اجرای عملی Signal Generation است.

Scheduler:

```text
هر 15 دقیقه
```

Timeframeهای Scheduled:

```text
15m
1h
```

برای 15m:

```text
Sync 1h
Sync 15m
```

برای 1h:

```text
Sync 1h
Build 4h candles
```

Scanner Freshness داده را بررسی می‌کند.

حداکثر عمر مجاز تقریباً:

```text
2 × timeframe
```

است.

اگر Market Data قدیمی باشد:

```text
Skip
```

می‌شود.

قبل از Generate کردن Signal نیز بررسی می‌شود که برای آخرین Candle قبلاً Signal وجود دارد یا نه.

این کار از Alert تکراری جلوگیری می‌کند.

فقط:

```text
BUY
SELL
```

به Telegram ارسال می‌شوند.

---

## 16. Telegram

Telegram فقط Channel مربوط به Alert است و سیستم با آن معامله انجام نمی‌دهد.

Configuration:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Alert شامل:

```text
Action
Symbol
Timeframe
Confidence
Entry
Stop Loss
Take Profit
Trend
RSI
ADX
Market Condition
Reason
```

است.

فقط:

```text
BUY
SELL
```

Alert می‌شوند.

برای:

```text
WAIT
NO_TRADE
```

Alert ارسال نمی‌شود.

Telegram Bot API با Configuration واقعی پروژه تست شد و پیام تست در Telegram دریافت شد.

---

## 17. Zod API Validation

برای Validation پاسخ‌های API از Zod استفاده شده است.

قسمت‌های Validate شده:

```text
Signal
Scanner
Backtest
```

---

## 18. تست نهایی

دستورات اصلی:

```bash
pnpm test
pnpm run build
pnpm exec ts-node --require reflect-metadata test/app.e2e-spec.ts
```

Validation نهایی:

```text
Unit Tests         ✅
Build              ✅
E2E                ✅
Indicators         ✅
Signal             ✅
Scanner            ✅
Backtest           ✅
Telegram           ✅
```

بنابراین Phase 1 از نظر فنی Validate و Freeze شده است.

---

## 19. معنی Alert فعلی

### BUY

یعنی مدل تکنیکال فعلی Setup را برای ورود مناسب تشخیص داده، فیلترهای لازم و Higher Timeframe Confirmation قبول شده و SL/TP محاسبه شده‌اند.

### SELL

یعنی مدل تکنیکال Setup نزولی را Actionable تشخیص داده، فیلترها تأیید شده‌اند و SL/TP محاسبه شده‌اند.

### NO_TRADE

یعنی سیستم عمداً معامله را رد کرده چون حداقل یکی از Filterهای لازم Fail شده است.

### WAIT

یعنی Setup فعلاً برای BUY یا SELL نهایی نشده است.

---

## 20. درصد تکمیل پروژه

وضعیت فعلی:

```text
Market Data              ✅
Indicators               ✅
Signal Engine            ✅
Risk Management          ✅
Multi-Timeframe          ✅
Backtesting              ✅
Strategy Validation      ✅
Signal Storage            ✅
Scanner                  ✅
Telegram Alerts          ✅
Zod API Validation       ✅
Unit Tests               ✅
Build                    ✅
E2E                      ✅
Final Validation         ✅
```

بنابراین:

```text
Phase 1 ≈ 95% complete
```

---

## 21. میزان قابل اعتماد بودن پروژه

دو مفهوم باید کاملاً از هم جدا شوند.

### اعتماد به Software Pipeline

با توجه به اینکه Market Data، Indicatorها، Signal Engine، Multi-Timeframe، Risk Calculation، Storage، Scanner، API Validation، Backtest، Telegram، Unit Test، Build و E2E همگی Validate شده‌اند، وضعیت فنی Pipeline را می‌توان حدوداً:

```text
≈ 85% technical confidence
```

در نظر گرفت.

این عدد درباره **درست کار کردن Software** است.

### اعتماد به سودده بودن Strategy

این عدد را نمی‌توان 85٪ یا هر درصد دیگری اعلام کرد.

چون:

```text
Confidence ≠ Win Probability
```

نتیجه Backtest فعلی:

```text
35.28% Win Rate
+19R Total
+0.058R Expectancy
```

است.

این فقط نتیجه تاریخی Dataset تست‌شده است و تضمین عملکرد آینده نیست.

---

## 22. محدودیت‌های فعلی

1. Confidence یک Rule Score است و Probability نیست.
2. Fee در Backtest فعلاً صفر است.
3. Slippage در Backtest فعلاً صفر است.
4. Provider فعلی فقط Symbolهای Mapping شده را پشتیبانی می‌کند.
5. Strategy هنوز باید روی Assetها و Market Regimeهای بیشتری آزمایش شود.
6. نتیجه تاریخی تضمین آینده نیست.
7. Auto Trading وجود ندارد.
8. Telegram فقط Alert ارسال می‌کند.
9. Scheduler به Active Assetهای درست Configuration شده وابسته است.
10. News/Fundamental Analysis هنوز پیاده‌سازی نشده است.

---

## 23. Phase 2

Phase 2 فعلاً عمداً عقب افتاده است.

جهت آینده:

```text
Technical Analysis
+
News
+
Fundamental Data
+
Market Context
```

موارد احتمالی:

- News
- Economic Events
- Fundamental Metrics
- Market Sentiment
- Macro Indicators

Phase 1 باید در وضعیت فعلی Freeze بماند و Phase 2 جداگانه توسعه پیدا کند.

---

## 24. فلسفه اصلی پروژه

سیستم به این سؤال جواب می‌دهد:

> «مدل تکنیکال فعلی بازار را چطور می‌بیند؟»

اما به این سؤال جواب نمی‌دهد:

> «آیا این معامله حتماً سود می‌کند؟»

تصمیم نهایی باید ترکیبی از این موارد باشد:

```text
Technical Signal
+
Risk Information
+
Market Context
+
Human Decision
```

---

## 25. Freeze نهایی Phase 1

Phase 1 اکنون:

```text
VALIDATED
TESTED
BUILT
E2E VERIFIED
TELEGRAM VERIFIED
FROZEN
```

است.

هر تغییری در Core Signal Rules در آینده باید باعث اجرای مجدد:

```text
Unit Tests
+
Build
+
E2E
+
Backtest
+
Strategy Validation
```

شود.

---

# Final Status

```text
Trading Assistant — Phase 1

Status:
COMPLETE AND FROZEN

Completion:
≈ 95%

Technical Pipeline Confidence:
≈ 85%

Trading Win Probability:
NOT DEFINED

Automatic Trading:
NO

Telegram Alerts:
YES

Backtesting:
YES

E2E:
YES
```
