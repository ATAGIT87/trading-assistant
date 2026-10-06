# APIهای فعلی و مسئولیت آن‌ها

برنامهٔ فعال ۶ کنترلر و ۱۹ route دارد. این فهرست با metadata واقعی Nest در تست راه‌اندازی تطبیق داده می‌شود. تحلیل جاری فقط از هستهٔ EMA50/RSI14 می‌آید؛ endpoint مستقل برای تحلیل قدیمی باقی نمانده است.

| کنترلر | سرویس کاربردی | دلیل باقی‌ماندن |
| --- | --- | --- |
| `AssetsController` | `AssetsService` | مدیریت بازارهایی که runner و زمان‌بند می‌خوانند؛ فعال/غیرفعال کردن بازار |
| `MarketDataController` | `MarketDataService` | دیدن کندل‌های بستهٔ ذخیره‌شده، بررسی کیفیت و بازیابی دادهٔ لازم برای خروج دمو |
| `SignalsController` | `SignalsService` | دریافت تصمیم جاری BUY/NO_TRADE از همان snapshot مورد استفادهٔ runner |
| `TechnicalAnalysisController` | `TechnicalAnalysisService` | توضیح snapshot، اندیکاتورها و دلیل تصمیم جاری؛ استراتژی جدا ندارد |
| `DemoTradingController` | `DemoTradingService` | وضعیت پوزیشن‌ها، نتیجهٔ خالص، reconciliation دستی و ورود دستی با مجوز |
| `TradingAssistantController` | `RunTradingAssistant` | وضعیت حلقه، بازارها، آخرین تصمیم و سلامت dedup پایدار |

## برنامهٔ فعال

| روش | مسیر | کاربرد |
| --- | --- | --- |
| GET | `/assets` | دارایی‌های ثبت‌شده |
| GET | `/assets/active` | دارایی‌های فعال |
| GET | `/assets/:id` | مشخصات یک دارایی |
| POST | `/assets` | ثبت دارایی با نماد پشتیبانی‌شده |
| PATCH | `/assets/:id` | تغییر مشخصات و `isActive` |
| DELETE | `/assets/:id` | حذف تنظیم دارایی؛ پوزیشن‌های قبلی همچنان مستقل پایش می‌شوند |
| GET | `/market-data/candles/:symbol/:timeframe` | حداکثر ۱۰۰ کندل بستهٔ اخیر، جدیدترین ابتدا |
| GET | `/market-data/candles/:symbol/:timeframe/latest` | آخرین کندل بسته |
| GET | `/market-data/candles/:symbol/:timeframe/quality` | کیفیت، پیوستگی و تازگی تاریخچهٔ ذخیره‌شده |
| POST | `/market-data/sync-spot/:symbol/:timeframe` | همگام‌سازی از Kraken؛ فقط کندل بسته ذخیره می‌شود |
| POST | `/market-data/repair-spot-gaps/:symbol/:timeframe` | تلاش برای ترمیم فاصله‌ها در پنجرهٔ موجود API |
| GET | `/signals/:symbol/:timeframe` | تصمیم استراتژی فعال؛ قاعدهٔ فعلی فقط 1h را پشتیبانی می‌کند |
| GET | `/technical-analysis/:symbol` | snapshot یک‌ساعته و دلیل همان تصمیم |
| GET | `/trading-assistant/status` | وضعیت عملیاتی runner |
| POST | `/demo-trading/open/:symbol/:timeframe` | ورود دستی از قاعدهٔ فعلی در حالت APPROVED با کنترل مجوز/هزینه/ظرفیت |
| GET | `/demo-trading/open` | پوزیشن‌های باز |
| POST | `/demo-trading/check` | اجرای دستی بررسی خروج |
| GET | `/demo-trading/history` | تاریخچه و نتیجهٔ خالص معاملات |
| GET | `/demo-trading/summary` | وضعیت سرمایه و خلاصهٔ دمو |

ورود خودکار فقط توسط `RunTradingAssistant` انجام می‌شود. ورود دستی دمو تحلیل مستقلی ندارد و همان snapshot را اجرا می‌کند؛ فلگ دمو، نسخهٔ تأییدشده و شواهد اجرا با تفکیک دقیقه‌ای باید اجازه بدهند؛ شواهد ساعتی کافی نیستند. این endpoint سفارش واقعی نمی‌فرستد. کیفیت تاریخچهٔ دیتابیس برای نگهداری داده و خروج است؛ برای تشخیص ورود از API سیگنال یا تحلیل جاری استفاده می‌شود.

نمادهای جاری `BTCEUR` و `ETHEUR` هستند. نماد و تایم‌فریم ورودی‌های دادهٔ بازار اعتبارسنجی می‌شوند. مسیرهای sync و repair مستقیماً سرویس نگهداری فعال را صدا می‌زنند؛ دیگر منطق ورود یا تحلیل قدیمی در کنترلر ندارند. پاسخ sync اکنون `{ symbol, timeframe, saved }` است؛ شمارش خام `received` که کندل باز را هم شامل می‌شد حذف شد.

## تحقیق؛ فقط روی سرور جدا

پس از `pnpm build:test` و `pnpm start:research`، مسیرهای زیر روی `127.0.0.1:3001` وجود دارند:

| روش | مسیر | کاربرد |
| --- | --- | --- |
| GET | `/backtesting/:symbol/:timeframe` | replay و ثبت نتیجه در دیتابیس تنظیم‌شده |
| GET | `/backtesting/history/:symbol/:timeframe` | نتیجه‌های ذخیره‌شده |
| GET | `/backtesting/readiness/:timeframe` | مجوز مبتنی بر شواهد پرتفوی برای نسخهٔ فعال |
| GET | `/backtesting/compare/:symbol/:timeframe` | مقایسهٔ نسخه‌های داده‌شده با queryهای `baseline` و `candidate` |
| GET | `/backtesting/portfolio/:timeframe` | بک‌تست پرتفوی |
| GET | `/backtesting/walk-forward/portfolio/:timeframe` | walk-forward پرتفوی |
| POST | `/research-data/build-4h/:symbol` | آماده‌سازی دادهٔ 4h فقط برای استراتژی‌های تاریخی |

ساخت 4h دیگر در زمان‌بند محصول اجرا نمی‌شود؛ ورود فعلی از آن استفاده نمی‌کند. بازسازی تحقیقاتی همان جدول دادهٔ 4h را در یک تراکنش جایگزین می‌کند و باید صریحاً فراخوان شود. پاک‌سازی کد هیچ‌کدام از این عملیات دیتابیس را اجرا نکرده است.

## مسیرهای حذف‌شده

- `/scanner/:symbol/:timeframe`: تکرار API سیگنال با یک wrapper جدا؛ کنترلر، سرویس، ماژول و schema حذف شدند.
- endpointهای RSI/SMA/EMA/ATR/ADX، مقایسهٔ قیمت با میانگین، trend، rsi-status و market-condition زیر `/market-data/candles/...`: مسیر تحلیل قدیمی خارج از استراتژی فعلی؛ wrapperها و `MarketDataAnalysisService` حذف شدند. محاسبات استفاده‌شدهٔ تاریخی فقط در `test/research/indicators` هستند.
- `POST /market-data/candles`: درج دستی/آزمایشی کندل؛ کنترلر و DTO حذف شدند. دادهٔ زنده از provider و تاریخچه از import صریح می‌آید.
- `GET /market-data/candles` و `GET /market-data/candles/:symbol`: فهرست‌های کلی و بدون محدودیت از CRUD اولیه؛ از خواندن محدوده‌دار بازار/تایم‌فریم استفاده می‌شود.
- `GET /market-data/spot-candles/:symbol`: دسترسی مستقیم به provider شامل کندل باز؛ برای snapshot از تحلیل جاری و برای تاریخچه از مسیر کندل بسته استفاده می‌شود.
- `POST /market-data/build-4h/:symbol`: از محصول حذف و به مسیر صریح تحقیق منتقل شد.
- `/backtesting/readiness/:symbol/:timeframe`: به `/backtesting/readiness/:timeframe` تبدیل شد؛ مجوز فعلی پرتفوی است و پارامتر بازار نقشی نداشت.

شاخهٔ قدیمی بررسی مجوز تک‌نماد هم حذف شد؛ تنها مسیر پرتفوی با همان شروط قبلی باقی است. query تکراری `findActiveAssets` با `findActive` ادغام شد. فیلد `isActive` به DTO تغییر دارایی افزوده شد تا کنترل فعال‌بودن که واقعاً در محصول استفاده می‌شود از API قابل انجام باشد.

اعتبارسنجی این پاک‌سازی: TypeScript و build موفق، ۸ تست موفق، ۵۷ فایل production با مسیر استفادهٔ مشخص و بدون import از تحقیق. بک‌تست با ساعت مرجع قبلی تکرار شد؛ تمام سیگنال‌ها، معاملات و نتایج متوالی BTC و ETH یکسان ماندند. هیچ عملیات دیتابیس یا ارسال تلگرام برای این بررسی‌ها انجام نشد.

اصلاح بعدی ریسک Spot: worker خروج هر دقیقه اجرا می‌شود و در ساعت باز
از کندل بستهٔ 1m استفاده می‌کند. پاسخ بررسی، تایم‌فریم کندل خروج را نیز
مشخص می‌کند. جزئیات و محدودیت‌ها در [بررسی ریسک](SPOT_RISK_REVIEW.md) هستند.
