# نقشهٔ ساختار پروژه

این سند وضعیت فعلی کد را توضیح می‌دهد. `production` یعنی کدی که برنامهٔ فعال اجرا می‌کند؛ به معنی معاملهٔ واقعی یا اثبات سودآوری نیست. دمو بخشی از محصول فعال است و در production می‌ماند. شبیه‌سازی روی تاریخچهٔ همان نسخهٔ فعلی در `test` قرار دارد؛ نسخه‌های ورود بازنشسته حذف شده‌اند.

رابطهٔ پوشه‌ها و مسیر اجرای آن‌ها در [نقشهٔ چرخهٔ production](PRODUCTION_CYCLE.md) آمده است. بررسی فعلی فایل جداافتاده یا پوشهٔ خالی پیدا نکرد؛ اتصال ماژول‌ها و exportهای بدون مصرف پاک‌سازی شدند.

```text
src/production/          برنامهٔ فعال
test/checks/             کنترل ساختار و تست‌های سازگاری
test/research/           بک‌تست، تحقیق و داده‌های تاریخی
operations/              نگهداری سرویس، ورود تاریخچه و migration
docs/                    تعریف جاری و نقشهٔ فایل‌ها
```

## مسیر اجرای فعال

رتبه‌بندی۳۰بازار آنلاین crypto/EUR در `trading-symbol.ts` تعریف شده و هر۲۴ساعت تازه می‌شود. API تحلیل، runner،
دمو و replay همان هستهٔ ماکروی بستهٔDaily EMA200 و پولبک4h EMA20/50 را مصرف
می‌کنند. صف پایدار Maker قبل از fill سرمایه و نقد رزرو می‌کند؛ ظرفیت فقط برای پوزیشن پرشده است؛ خروج‌ها
و Break-even هم از قواعد مشترک Maker می‌آیند. سیگنال4h و اجرای دمو1h
جدا هستند؛ `demo_position.executionTimeframe` اجرای جدید را حفظ می‌کند و null
قواعد خروج قبلی را نگه می‌دارد. Scheduler دادهٔ بازارهای دارای تعهد را در
مرز کندل تازه می‌کند؛ اسکن۳۰بازار مسئولیت runner است. فهرست assets فقط metadata
است و رتبه‌بندی سبد را تغییر نمی‌دهد. [نقشهٔ چرخه](PRODUCTION_CYCLE.md) را ببینید.

## فایل‌های production

مسیرهای جدول زیر نسبت به `src/production` هستند. فایل `*.module.ts` در هر بخش، اتصال سرویس‌ها، کنترلرها و وابستگی‌های همان بخش را به Nest تعریف می‌کند.

| فایل | مسئولیت |
| --- | --- |
| `main.ts` | شروع HTTP، اعتبارسنجی درخواست و shutdown |
| `app.module.ts` | اتصال ماژول‌های فعال، دیتابیس و زمان‌بندی |
| `assets/assets.module.ts` | ثبت اجزای مدیریت دارایی |
| `assets/assets.controller.ts` | API ایجاد، خواندن و تغییر دارایی‌ها |
| `assets/assets.service.ts` | عملیات دیتابیس دارایی و انتخاب دارایی فعال |
| `assets/entities/asset.entity.ts` | مدل جدول `asset` |
| `assets/dto/create-asset.dto.ts` | اعتبارسنجی ایجاد دارایی |
| `assets/dto/update-asset.dto.ts` | اعتبارسنجی تغییر دارایی |
| `assets/enums/asset-type.enum.ts` | نوع دارایی |
| `assets/enums/timeframe.enum.ts` | تایم‌فریم‌های شناخته‌شده |
| `assets/timeframe.utils.ts` | مدت هر تایم‌فریم برای بسته‌شدن کندل |
| `market-data/market-data.module.ts` | اتصال دریافت و ذخیرهٔ داده |
| `market-data/market-data.controller.ts` | API کندل بسته، کیفیت، sync و ترمیم داده |
| `market-data/market-data.service.ts` | ذخیرهٔ کندل بسته، sync، ترمیم و quote برای پذیرش post-only |
| `market-data/market-data-provider.service.ts` | دریافت Kraken REST و تبدیل قالب آن |
| `market-data/market-candle-storage.service.ts` | خواندن و نوشتن کندل در دیتابیس |
| `market-data/market-data-quality.ts` | اعتبار OHLCV، پیوستگی و تازگی |
| `market-data/trading-symbol.ts` | نمادهای مجاز و pipe اعتبارسنجی نماد |
| `market-data/entities/market-candle.entity.ts` | مدل جدول `market_candle` |
| `risk/risk.module.ts` | ارائهٔ سرویس ریسک |
| `risk/risk-manager.service.ts` | محاسبهٔ SL، TP و نسبت ریسک/پاداش |
| `signals/signals.module.ts` | اتصال تحلیل و تنها استراتژی فعال |
| `signals/signals.controller.ts` | API سیگنال فعال |
| `signals/signals.service.ts` | گرفتن snapshot مشترک و تبدیل آن به سیگنال |
| `signals/strategy-registry.service.ts` | انتخاب نسخهٔ فعال؛ نسخه‌های تحقیقاتی را فعال نمی‌کند |
| `signals/signal.types.ts` | قرارداد دادهٔ سیگنال و تحلیل |
| `signals/technical-analysis.controller.ts` | API توضیح تحلیل بازار |
| `signals/technical-analysis.service.ts` | پاسخ تشخیصی از همان snapshot فعال |
| `trading/ema-rsi-spot.strategy.ts` | تبدیل پولبک4h با ماکرویDaily به سیگنال BUY با سطوح ریسک |
| `trading/ccxt/analyze-market.ts` | دریافت/اعتبارسنجی CCXT و هستهٔ تصمیم فقط روی کندل بسته |
| `trading/ccxt/market-analysis.service.ts` | cache کوتاه و ادغام درخواست‌های هم‌زمان تحلیل |
| `trading/ccxt/run-trading-assistant.ts` | حلقهٔ فعال؛ تنها مسئول ورود خودکار دمو |
| `trading/ccxt/trading-assistant.module.ts` | اتصال runner و API وضعیت |
| `trading/maker-execution.ts` | کارمزد ثابت، سقف شش پوزیشن پرشده، TTL24ساعت، fill لیمیت، توقف پرنشده و BE مشترک |
| `trading/trade-execution.ts` | تطبیق سطوح با قیمت ورود و پذیرش هدف پس از هزینه |
| `trading/trade-outcome.ts` | بازسازی علّی خروج Maker و Break-even از تاریخچهٔ پیوسته |
| `trading/spot-position-sizing.ts` | مقدار معامله با بودجهٔ ریسک و سقف سرمایه |
| `trading/spot-trading-policy.ts` | محدودیت ورود اسپات به BUY |
| `trading/net-trade-result.ts` | WIN/LOSS/BREAKEVEN بر اساس نتیجهٔ خالص |
| `demo-trading/demo-trading.module.ts` | اتصال دمو، دیتابیس، مجوز و اعلان |
| `demo-trading/demo-trading.controller.ts` | API ورود دستی، پوزیشن باز، تاریخچه و خلاصه |
| `demo-trading/demo-trading.service.ts` | پذیرش سرمایه/هزینه، ثبت اتمیک ورود و reconciliation خروج |
| `demo-trading/demo-trading.scheduler.ts` | همگام‌سازی داده و پایش خروج هر دقیقه؛ ورود خودکار ندارد |
| `demo-trading/entities/demo-position.entity.ts` | مدل جدول `demo_position` و هزینهٔ ثبت‌شدهٔ معامله |
| `demo-trading/demo-position-result.ts` | بازسازی نتیجهٔ خالص پوزیشن از مقادیر ذخیره‌شده |
| `demo-trading/demo-notification-outbox.ts` | ذخیرهٔ پوزیشن و رویداد اعلان در یک تراکنش |
| `demo-trading/demo-notification-delivery.service.ts` | خواندن اعلان‌های معوق، ارسال و ثبت تحویل |
| `demo-trading/telegram-notification.service.ts` | قالب پیام و ارتباط HTTP با Telegram |
| `alerts/entities/alert-delivery.entity.ts` | مدل جدول `alert_delivery` برای نشانگر و صف پایدار |
| `strategy-approval/strategy-approval.module.ts` | اتصال خواندن شواهد به دمو |
| `strategy-approval/strategy-approval.service.ts` | بررسی شروط مجوز از نتیجه‌های قبلاً ذخیره‌شده؛ بک‌تست اجرا نمی‌کند |
| `strategy-approval/entities/strategy-evidence.entity.ts` | مدل همان جدول موجود `backtest_run`؛ نام جدول تغییر نکرده |
| `strategy-approval/evidence-result.ts` | قرارداد JSON ذخیره‌شده برای بررسی مجوز |
| `strategy-approval/evidence-trade.ts` | قرارداد معامله در شواهد ذخیره‌شده |
| `strategy-approval/evidence-capacity.ts` | بررسی ظرفیت هم‌زمان در شواهد پرتفوی |
| `strategy-approval/evidence-engine.ts` | شناسهٔ موتور سازگار برای قبول شواهد |

`strategy-approval` کد تست نیست: دمو برای تصمیم ورود به خواندن شواهد نیاز دارد. فقط قرارداد ذخیره و بررسی مجوز در production است؛ تولید آن شواهد در تحقیق انجام می‌شود. پوزیشن‌های قبلی مبنای هزینه و SL/TP خود را نگه می‌دارند؛ خروج‌ها Maker هستند و تایم‌فریم ثبت‌شدهٔ هر پوزیشن حفظ می‌شود.

## فایل‌های تست و تحقیق

| مسیر نسبت به `test` | مسئولیت |
| --- | --- |
| `tsconfig.json` | typecheck/build مستقل تست، تحقیق و ابزارهای عملیاتی |
| `checks/check-structure.cjs` | رد import خارج از production و فایل production بدون مسیر استفاده |
| `checks/runtime-compatibility.test.ts` | سازگاری جدول شواهد و رد مجوز برای fillهای تأییدنشده |
| `checks/current-api.test.ts` | جلوگیری از ذخیرهٔ کندل باز در sync و اعتبار ورودی metadata دارایی |
| `checks/maker-execution.test.ts` | سفارش passive، trade-through، BE، شکاف، نقد مشترک و ظرفیت |
| `checks/maker-demo.test.ts` | صف پایدار، restart، انقضا، هزینه و خروج Maker پوزیشن قدیمی |
| `checks/module-bootstrap.test.ts` | راه‌اندازی واقعی Nest با دیتابیس آفلاین؛ تطبیق۲۰ route فعال و نبود سرویس تحقیق در محصول |
| `checks/mtf-analysis.test.ts` | قانون پولبک4h، EMA200، منع look-ahead، برابری live/replay و رتبه‌بندی پویای۳۰بازار |
| `checks/verify-live-service.cjs` | بررسی خواندنی API و Telegram bot/chat؛ پیام نمی‌فرستد |
| `research/main.ts` | شروع سرور تحقیق محلی روی پورت 3001، بدون job و اعلان خودکار |
| `research/research.module.ts` | افزودن APIهای بک‌تست فقط به فرایند تحقیق |
| `research/backtesting/backtesting.module.ts` | اتصال موتور و replay همان استراتژی جاری |
| `research/backtesting/backtesting.controller.ts` | API فقط خواندنی پرتفوی و readiness |
| `research/backtesting/spot-basket-simulation.ts` | شبیه‌سازی ترتیبی نقد مشترک، رزرو سفارش، ماه‌ها و پوشش داده |
| `research/backtesting/backtesting.service.ts` | آداپتور خواندن داده و اجرای سبد پویای۳۰دارایی |
| `research/strategies/ema-rsi-replay.strategy.ts` | adapter کندل تاریخی به هستهٔ فعلی EMA50/RSI14 با فیلتر روند چهارساعته |
| `research/data/kraken-csv.ts` | خواندن و اعتبارسنجی CSV رسمی1h/4h/Daily بدون ساخت کندل مصنوعی |
| `research/scripts/backtest-spot-basket.ts` | اجرای detached سبد پویای۳۰دارایی با CSV رسمی، بدون DB و سفارش |
| `research/scripts/download-kraken-archive.py` | دریافت گزینشی CSV رسمی بازارهای EUR موجود در دوره |
| `research/artifacts/kraken-history-2026-10-06/` | CSVها، رسید دانلود و فقط نتیجهٔ جاری بک‌تست |

## نگهداری و مستندات

`operations/scripts/import-kraken-csv.ts` تاریخچهٔ واقعی را با درخواست صریح وارد دیتابیس می‌کند. `inspect-project-service.py` پردازش‌های همین پروژه را پیدا می‌کند و `restart-audited-service.py` همان پردازش‌ها را جایگزین می‌کند. migration موجود در `operations/migrations` است. این ابزارها جزو build یا bootstrap محصول نیستند.

تعریف قاعدهٔ جاری در [STRATEGY.md](STRATEGY.md)، جزئیات تحلیل در [CCXT.md](CCXT.md) و قواعد نگهداری در [پروتکل](TRADING_ASSISTANT_PROJECT_PROTOCOL.md) است. نسخه‌های قدیمی و اسناد آرشیوی منسوخ حذف شده‌اند.

## پاک‌سازی و بررسی

مسیرهای تحقیق نسخه‌های قبلی، موتور next-open، walk-forward، registry اضافی،
helper/schemaهای منسوخ و خروج دقیقه‌ای/Market و حفاظت سود قدیمی حذف شدند.
تنها یک نسخهٔ ورود، یک موتور تحقیق سبد و یک گزارش جاری باقی است؛ دادهٔ خام
داده‌های خام و قرارداد جدول‌های موجود حفظ شده‌اند. ردیف دیتابیس حذف نشده.

`pnpm typecheck`، `pnpm typecheck:test`، `pnpm build` و `pnpm test` بررسی‌های
اصلی‌اند. کنترل ساختار فایل جداافتاده، import تحقیق در محصول و پوشهٔ خالی
را رد می‌کند. مستندات [API](API.md)، [قاعده](STRATEGY.md) و
[ارزیابی](CURRENT_EVALUATION.md) مسئولیت و محدودیت‌ها را توضیح می‌دهند.

سیاست stop نسخهٔ v4 در signal و پوزیشن ذخیره می‌شود. `maker-execution.ts`
خروج Market stop جدید و سازگاری stopهای Maker قبلی را مدیریت می‌کند؛
`trade-outcome.ts` لغزش خروج را بازمی‌گرداند و ledger آن را بدون دوباره‌کاهی
حساب می‌کند. موتور سبد موجود، دادهٔ اجرای مستقل1h را کنار سیگنال4h می‌پذیرد.
