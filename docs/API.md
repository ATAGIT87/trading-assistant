# API فعلی

محصول۶ کنترلر و۲۰ مسیر دارد. تست راه‌اندازی واقعی Nest به‌صورت آفلاین
inventory را کنترل می‌کند. نمادهای crypto/EUR معتبر پذیرفته می‌شوند؛ حلقه ورود۳۰بازار آنلاین را با حجم EUR انتخاب می‌کند. سیگنال و ورود فقط4h را می‌پذیرند؛ سایر تایم‌فریم‌ها برای داده و
metadata سابق قابل‌خواندن‌اند، نه استراتژی فعال جداگانه.

| روش | مسیر | مسئولیت |
| --- | --- | --- |
| GET | `/assets` | فهرست metadata |
| GET | `/assets/active` | metadata دارای isActive؛ سبد ثابت runner را تغییر نمی‌دهد |
| GET | `/assets/:id` | مشخصات metadata |
| POST | `/assets` | ثبت metadata با نماد مجاز |
| PATCH | `/assets/:id` | تغییر metadata |
| DELETE | `/assets/:id` | حذف metadata؛ پوزیشن را حذف نمی‌کند |
| GET | `/market-data/candles/:symbol/:timeframe` | حداکثر۱۰۰ کندل بسته اخیر |
| GET | `/market-data/candles/:symbol/:timeframe/latest` | آخرین کندل بسته |
| GET | `/market-data/candles/:symbol/:timeframe/quality` | اعتبار و پوشش داده |
| POST | `/market-data/sync-spot/:symbol/:timeframe` | دریافت و ذخیرهٔ فقط کندل بسته |
| POST | `/market-data/repair-spot-gaps/:symbol/:timeframe` | ترمیم در محدودهٔ recent API، اکنون شامل4h |
| GET | `/signals/:symbol/:timeframe` | سیگنال4h با فیلترDaily از همان هستهٔ فعال |
| GET | `/technical-analysis/:symbol` | snapshot و علت تصمیم4h با فیلترDaily |
| GET | `/trading-assistant/status` | ۳۰ بازار پویا، حلقه و سیاست اجرا |
| POST | `/demo-trading/open/:symbol/:timeframe` | درخواست صف Maker در حالت APPROVED، مشروط به شواهد/سرمایه |
| GET | `/demo-trading/orders` | سفارش‌های Maker معلق، قیمت، زمان انقضا و رزرو EUR |
| GET | `/demo-trading/open` | پوزیشن‌های پرشده و باز |
| POST | `/demo-trading/check` | بررسی fill سفارش و خروج Maker |
| GET | `/demo-trading/history` | نتیجهٔ خالص، هزینه و قیمت خروج |
| GET | `/demo-trading/summary` | نقد آزاد، سرمایه رزرو، ظرفیت و عملکرد |

ورود خودکار فقط از RunTradingAssistant است. انطباق سیگنال به معنی fill نیست؛
سفارش لیمیت ممکن است منقضی شود یا استاپ sell پر نشود. همهٔ مسیرها دمو هستند
و سفارش صرافی ارسال نمی‌کنند. تاریخچهٔ OHLC شواهد معتبر Maker تلقی نمی‌شود.
برای توقف ورود از DEMO_ENTRIES_PAUSED استفاده می‌شود.

سیگنال همچنان4h است؛ سفارش‌های نسخهٔ فعلی با کندل بسته1h بررسی می‌شوند.
`/demo-trading/orders` و summary فیلدهای `signalTimeframe` و `executionTimeframe` را دارند؛
پوزیشن جدید `executionTimeframe=1h` را برای خروج پس از restart ذخیره می‌کند.
مقدار null در پوزیشن‌های قبلی یعنی استفاده از timeframe ثبت‌شدهٔ همان پوزیشن.
Scheduler فقط بازارهای دارای سفارش/پوزیشن را sync می‌کند و دریافت موفق را
تا مرز کندل بعدی تکرار نمی‌کند. migration لازم: `operations/migrations/20261006-hourly-demo-execution.sql`.

## تحقیق فقط روی127.0.0.1:3001

| روش | مسیر | مسئولیت |
| --- | --- | --- |
| GET | `/backtesting/readiness/:timeframe` | خواندن مجوز شواهد نسخهٔ جاری |
| GET | `/backtesting/portfolio/:timeframe` | حساب مشترک سبد فعلی۳۰دارایی، فقط4h با ماکرویDaily، بدون نوشتن شواهد |

دادهٔ سال محفوظ به‌طور پیش‌فرض کنار گذاشته می‌شود؛ includeHoldout=true فقط
درخواست صریح تحقیق برای آن داده است. پیش‌فرض شبیه‌سازی طولانی‌ترین بازهٔ
مشترک پیوسته را بر اساس پوشش انتخاب می‌کند و محدوده را گزارش می‌دهد.
CLI `pnpm backtest:spot-basket --data-dir ...` موتور را با دادهٔ رسمی4h/Daily و انتخاب۳۰بازار از حجم روز گذشته اجرا می‌کند.

مسیرهای قدیمی تک‌نماد، history و walk-forward و helperهای next-open تحقیق
حذف شدند؛ این تغییر API تحقیق است. قالب وضعیت Maker و سبد مشترک جای آن‌ها
را گرفته است. [قاعده و محدودیت‌ها](STRATEGY.md) را ببینید.

## مسیرهای حذف‌شده

- `/scanner/:symbol/:timeframe`: تکرار API سیگنال با یک wrapper جدا؛ کنترلر، سرویس، ماژول و schema حذف شدند.
- endpointهای RSI/SMA/EMA/ATR/ADX، مقایسهٔ قیمت با میانگین، trend، rsi-status و market-condition زیر `/market-data/candles/...`: مسیر تحلیل قدیمی خارج از استراتژی فعلی؛ wrapperها و `MarketDataAnalysisService` حذف شدند. استراتژی‌ها و سرویس اندیکاتور قدیمیِ تحقیق هم حذف شدند.
- `POST /market-data/candles`: درج دستی/آزمایشی کندل؛ کنترلر و DTO حذف شدند. دادهٔ زنده از provider و تاریخچه از import صریح می‌آید.
- `GET /market-data/candles` و `GET /market-data/candles/:symbol`: فهرست‌های کلی و بدون محدودیت از CRUD اولیه؛ از خواندن محدوده‌دار بازار/تایم‌فریم استفاده می‌شود.
- `GET /market-data/spot-candles/:symbol`: دسترسی مستقیم به provider شامل کندل باز؛ برای snapshot از تحلیل جاری و برای تاریخچه از مسیر کندل بسته استفاده می‌شود.
- `POST /market-data/build-4h/:symbol` و `/research-data/build-4h/:symbol`: حذف شدند؛ replay فعلی داده‌های رسمی مستقل4h وDaily را می‌خواند.
- `GET /backtesting/compare/:symbol/:timeframe`: حذف شد؛ فقط یک نسخهٔ ورود قابل اجرا باقی مانده است.
- `/backtesting/readiness/:symbol/:timeframe`: به `/backtesting/readiness/:timeframe` تبدیل شد؛ مجوز فعلی پرتفوی است و پارامتر بازار نقشی نداشت.

## سیاست خروج نسخهٔ v4

سفارش‌های جدید `stopOrderType=market` دارند؛ خرید و TP همچنان Limit هستند.
`stopExecutionPolicy` روی پوزیشن ذخیره می‌شود؛ null در رکوردهای قبلی یعنی
MAKER_ONLY. summary کارمزد stop=0.004 و لغزش فرضی stop=0.001 را نمایش می‌دهد.
خروج در کندل ساعتی بسته مدل می‌شود، نه سفارش واقعی یا پایش tick.
Migration: `operations/migrations/20261006-demo-market-stop.sql`.
API سبد تست، دادهٔ مستقل1h برای همهٔ نمادها می‌خواهد؛ نبود داده خطاست.
