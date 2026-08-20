# مشخصات جریان کاری و پیاده‌سازی Backend

## 1. هدف این سند

این سند مرجع اصلی ساخت Backend محصول تحلیلی پذیرندگان زرین‌پال است. پیاده‌سازی باید بر اساس تصمیم‌ها، تعاریف، قراردادها و شروط پذیرش این سند انجام شود. هرجا داده اجازه اثبات یک ادعا را نمی‌دهد، Backend نباید آن ادعا را تولید کند.

## 2. هدف محصول

محصول باید داده‌های پرداخت هر پذیرنده را به بینش‌های عددی، قابل اقدام و قابل ردیابی تبدیل کند. خروجی صرفاً نمودار نیست. هر بینش باید پاسخ دهد:

1. چه اتفاقی افتاده است؟
2. اندازه تغییر چقدر است؟
3. اثر مالی تقریبی آن چیست؟
4. کدام عوامل با این تغییر مرتبط‌اند؟
5. پذیرنده چه اقدامی می‌تواند انجام دهد؟
6. عدد و ادعا دقیقاً چگونه محاسبه شده‌اند؟

## 3. واقعیت‌های دیتاست

فایل ورودی فعلی:

`other_challenge_data.csv.gz`

مشخصات مشاهده‌شده:

- حدود 2,213,289 ردیف
- حدود 2,062,839 سشن یکتا
- 343 پذیرنده
- بازه زمانی 2026-01-01 تا 2026-06-30
- هر ردیف یک تلاش پرداخت است، نه یک فروش مستقل.
- یک `session_key` می‌تواند چند `try_seq` داشته باشد.
- داده به‌شدت روی چند پذیرنده متمرکز است؛ بنابراین میانگین کل معیار مقایسه مناسبی نیست.
- `payer_card_key` در بخش قابل توجهی از ردیف‌ها خالی است.
- ستون محصول، SKU، شناسه سفارش یا اقلام سبد خرید وجود ندارد.

### محدودیت ادعاها

- نباید مبلغ تمام ردیف‌ها مستقیماً جمع شود؛ این کار باعث چندبار شمردن مبلغ سشن‌های چندتلاشی می‌شود.
- تحلیل مشتری فقط در محدوده همان پذیرنده و روی داده‌های دارای `payer_card_key` معتبر است.
- اولین مشاهده کارت در فایل، لزوماً اولین خرید عمر مشتری نیست؛ فقط اولین مشاهده در بازه دیتاست است.
- بدون داده محصول نباید درباره فروش یک کالای خاص ادعا تولید شود.
- روابط آماری نباید به‌عنوان رابطه علّی قطعی نمایش داده شوند.

## 4. پشته فناوری قطعی

### Backend

- Python 3.12
- Django 5.2 LTS یا جدیدترین نسخه پایدار سازگار با وابستگی‌ها
- Django Ninja برای API، Schema Validation و OpenAPI
- Pydantic Schemaهای Django Ninja برای قرارداد ورودی و خروجی

### ذخیره‌سازی و تحلیل

- PostgreSQL برای کاربران، پذیرنده‌ها، تنظیمات، هشدارها، اجرای تحلیل و metadata
- DuckDB برای ingestion و queryهای تحلیلی
- Parquet برای نگه‌داری داده‌های ستونی آماده تحلیل
- Django ORM فقط برای داده‌های اپلیکیشن؛ تحلیل سنگین تراکنش‌ها با ORM انجام نشود.

### پردازش پس‌زمینه

- در MVP، Django management command برای ingestion و refresh کافی است.
- Celery و Redis فقط زمانی اضافه شوند که اجرای زمان‌بندی‌شده یا jobهای غیرهمزمان واقعاً لازم باشد.
- API نباید در هر request فایل CSV فشرده را دوباره بخواند.

### کیفیت و اجرا

- `uv` برای مدیریت محیط و وابستگی‌ها
- Pytest و pytest-django برای تست
- Ruff برای lint و format
- mypy برای type checking بخش‌های اصلی
- Docker Compose برای اجرای محلی PostgreSQL و Backend
- Uvicorn یا Gunicorn با worker سازگار با ASGI برای اجرا

## 5. معماری کلان

```text
CSV.GZ خام
   ↓
Ingestion + Validation
   ↓
DuckDB staging tables
   ↓
attempt_fact → session_fact
   ↓
customer_merchant_fact + merchant_daily_metrics
   ↓
Metric Engine
   ↓
Insight Engine
   ↓
ذخیره metadata و insight در PostgreSQL
   ↓
Django Ninja API
   ↓
React Web App
```

## 6. مرز مسئولیت ماژول‌ها

ساختار پیشنهادی:

```text
backend/
├── manage.py
├── pyproject.toml
├── config/
│   ├── settings/
│   ├── urls.py
│   ├── api.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── accounts/
│   ├── merchants/
│   ├── analytics/
│   │   ├── api/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── metrics/
│   │   ├── insights/
│   │   ├── repositories/
│   │   ├── sql/
│   │   └── management/commands/
│   ├── alerts/
│   └── audit/
├── data/
│   ├── raw/
│   ├── processed/
│   └── warehouse/
└── tests/
```

قواعد مرزی:

- API فقط ورودی را اعتبارسنجی، service را فراخوانی و response را serialize می‌کند.
- endpoint نباید SQL تحلیلی یا منطق محاسبه معیار داشته باشد.
- serviceها use caseهای محصول را اجرا می‌کنند.
- repositoryها تنها لایه دسترسی به PostgreSQL، DuckDB یا Parquet هستند.
- تعریف هر معیار در یک ماژول مستقل و نسخه‌دار نگه‌داری می‌شود.
- Insight Engine از Metric Engine استفاده می‌کند و محاسبات پایه را دوباره پیاده‌سازی نمی‌کند.

## 7. مدل‌های داده تحلیلی

### 7.1. `attempt_fact`

سطح هر رکورد: یک تلاش پرداخت.

کلید منطقی:

`session_key + try_seq`

ستون‌های اصلی:

- session_key
- try_seq
- terminal_key
- merchant_key
- category_id
- category_title
- amount
- adjusted_fee
- session_status
- try_status
- switch_response_code
- psp_code
- issuer_bank_code
- payer_card_key
- verify_type
- init_time_ms
- verify_time_ms
- created_at
- try_created_at
- verified_at
- settled_at
- expire_in

### 7.2. `session_fact`

سطح هر رکورد: یک `session_key` یکتا.

حداقل ستون‌های مشتق‌شده:

- session_key
- merchant_key
- terminal_key
- category_id
- amount
- final_status
- is_successful
- is_reversed
- attempts_count
- max_try_seq
- has_real_attempt
- has_bank_entry
- has_retry
- recovered_after_retry
- first_attempt_at
- last_attempt_at
- verified_at
- settled_at
- completion_time_ms
- final_psp_code
- final_issuer_bank_code
- payer_card_key
- data_quality_flags

قواعد ساخت این جدول باید deterministic، تست‌شده و نسخه‌دار باشند.

### 7.3. `customer_merchant_fact`

کلید منطقی:

`merchant_key + payer_card_key`

فقط از سشن‌های موفق دارای کارت ساخته شود.

ستون‌های اصلی:

- merchant_key
- payer_card_key
- first_seen_at
- last_seen_at
- successful_sessions
- successful_amount
- average_amount
- median_amount
- days_since_last_seen
- is_returning_in_observed_window

### 7.4. `merchant_daily_metrics`

کلید منطقی:

`merchant_key + metric_date`

شامل معیارهای ازپیش‌محاسبه‌شده برای پاسخ سریع Dashboard باشد.

## 8. اعتبارسنجی و کنترل کیفیت داده

Ingestion باید حداقل کنترل‌های زیر را اجرا کند:

- وجود تمام ستون‌های اجباری
- صحت datatypeها و timestampها
- یکتایی `session_key + try_seq`
- بررسی ثابت بودن merchant، terminal و amount داخل هر session
- بررسی ترتیب و مقادیر `try_seq`
- بررسی timestampهای منفی یا غیرمنطقی
- تناقض statusها و زمان‌های verified/settled
- نرخ null هر ستون، به تفکیک کل و پذیرنده
- ثبت سشن‌های Reversed و جلوگیری از احتساب آن‌ها به‌عنوان فروش عادی
- شناسایی amountهای صفر، منفی یا پرت بدون حذف خاموش آن‌ها
- تولید `data_quality_report` برای هر ingestion

رکورد مسئله‌دار نباید بی‌صدا حذف شود. وضعیت آن باید با reason ثبت شود.

## 9. فرهنگ معیارها

تمام KPIها باید یک تعریف مرکزی و نسخه‌دار داشته باشند.

### فروش موفق

مجموع `amount` سشن‌های موفق، با یک بار شمارش هر `session_key`.

### نرخ موفقیت

```text
successful valid sessions / all valid sessions
```

تعریف نهایی موفقیت باید پس از اعتبارسنجی معنای `Verified` و `Paid` تثبیت شود. تا آن زمان assumption در trace ثبت شود.

### نرخ NoAttempt

```text
sessions without a real payment attempt / all valid sessions
```

### نرخ Retry

```text
sessions with more than one real attempt / sessions with a real attempt
```

### نرخ بازیابی Retry

```text
sessions that failed initially and eventually succeeded / retried sessions
```

### مبلغ بازیابی‌شده

مجموع amount سشن‌هایی که بعد از حداقل یک تلاش ناموفق، موفق شده‌اند.

### مبلغ بالقوه ازدست‌رفته

مجموع amount سشن‌های نهایی ناموفق. در UI باید «بالقوه» یا «در معرض از دست رفتن» نامیده شود، نه زیان قطعی.

### مشتری بازگشتی

`payer_card_key` دارای حداقل دو سشن موفق برای همان merchant در بازه مشاهده‌شده.

### پوشش شناسایی مشتری

```text
successful sessions with payer_card_key / all successful sessions
```

هر خروجی مرتبط با مشتری باید این coverage را همراه داشته باشد.

## 10. Baseline و مقایسه

مقایسه پیش‌فرض هر پذیرنده:

1. دوره قبل با طول برابر
2. روزهای مشابه هفته در چهار هفته قبل
3. ساعت مشابه در روزهای مشابه
4. پذیرنده‌های هم‌دسته و هم‌حجم، فقط در صورت نمونه کافی

به دلیل تمرکز شدید داده روی چند پذیرنده، میانگین ساده کل دیتاست baseline پیش‌فرض نیست. برای benchmark گروهی از median، trimmed mean یا weighted method مستند استفاده شود.

## 11. Insight Engine

هر insight باید مراحل زیر را طی کند:

1. تشخیص تغییر
2. بررسی حداقل حجم نمونه
3. سنجش اهمیت عملی و در صورت نیاز آماری
4. تخمین اثر مالی
5. breakdown بر اساس عوامل موجود
6. کنترل حداقل متغیرهای مخدوش‌کننده
7. تولید اقدام پیشنهادی محدود و قابل دفاع
8. ساخت trace کامل

ابعاد breakdown:

- ساعت و روز هفته
- PSP
- issuer bank
- terminal
- amount bucket
- مشتری جدید یا بازگشتی
- attempts count
- switch response code
- verify type

### زبان ادعا

- مجاز: «این افت عمدتاً با افزایش خطاهای PSP-02 هم‌زمان بوده است.»
- مجاز: «پس از کنترل مبلغ، ساعت و بانک، اختلاف همچنان مشاهده می‌شود.»
- غیرمجاز: «PSP-02 باعث افت فروش شده است.» مگر طراحی علّی معتبر وجود داشته باشد.

## 12. قرارداد استاندارد Insight

هر Insight API حداقل این ساختار مفهومی را برگرداند:

```json
{
  "id": "string",
  "merchant_id": "string",
  "type": "payment_success_drop",
  "severity": "low|medium|high|critical",
  "title": "string",
  "summary": "string",
  "metric": {
    "name": "success_rate",
    "current": 0.641,
    "baseline": 0.702,
    "absolute_change": -0.061,
    "relative_change": -0.087
  },
  "financial_impact": {
    "amount": 187000000,
    "currency": "IRR",
    "method": "string"
  },
  "drivers": [],
  "recommended_actions": [],
  "confidence": 0.91,
  "coverage": 0.97,
  "period": {},
  "baseline_period": {},
  "trace_id": "string",
  "generated_at": "ISO-8601"
}
```

## 13. Traceability

برای هر KPI و Insight باید این موارد قابل دریافت باشند:

- metric name و metric definition version
- dataset version و ingestion run ID
- سطح محاسبه: attempt یا session
- merchant و بازه زمانی
- فیلترهای اعمال‌شده
- صورت و مخرج معیار
- تعداد رکورد ورودی و خروجی
- تعداد رکورد حذف‌شده به همراه دلایل
- missing-data coverage
- baseline definition
- breakdownها و contribution هر عامل
- query template ID یا calculation ID
- پارامترهای query
- زمان تولید
- نمونه رکوردهای evidence با pagination

SQL خام نباید به‌صورت ناامن مستقیماً به کاربر عمومی داده شود، اما فرمول انسانی، پارامترها و داده شاهد باید قابل مشاهده باشند.

## 14. APIهای MVP

```text
GET  /api/v1/health
GET  /api/v1/merchants
GET  /api/v1/merchants/{merchant_key}/overview
GET  /api/v1/merchants/{merchant_key}/payment-health
GET  /api/v1/merchants/{merchant_key}/funnel
GET  /api/v1/merchants/{merchant_key}/retry-analysis
GET  /api/v1/merchants/{merchant_key}/customer-retention
GET  /api/v1/merchants/{merchant_key}/insights
GET  /api/v1/insights/{insight_id}
GET  /api/v1/insights/{insight_id}/trace
GET  /api/v1/insights/{insight_id}/evidence
GET  /api/v1/data-quality/latest
POST /api/v1/admin/ingestion-runs
POST /api/v1/admin/analytics-refresh
```

### پارامترهای مشترک

- `date_from`
- `date_to`
- `timezone` با پیش‌فرض `Asia/Tehran`
- `terminal_key`
- `psp_code`
- `issuer_bank_code`
- `amount_bucket`
- pagination برای لیست‌ها و evidence

### قواعد API

- تاریخ‌ها در API با ISO-8601 جابه‌جا شوند.
- مبلغ به‌صورت integer و با currency مشخص برگردد.
- درصد در Backend به شکل عدد بین صفر و یک باشد.
- responseها نسخه‌دار باشند.
- error response استاندارد شامل code، message، details و request_id باشد.
- دسترسی merchant-level اجباری است؛ کاربر نباید merchant دیگر را query کند.

## 15. Performance و Cache

- Dashboard از جداول aggregate خوانده شود.
- queryهای ad hoc محدود، timeoutدار و paginationدار باشند.
- cache key شامل merchant، بازه، فیلترها، metric version و dataset version باشد.
- refresh داده باید cacheهای وابسته را invalidate کند.
- هیچ endpoint عادی نباید ingestion کامل را trigger کند.
- هدف اولیه: پاسخ endpointهای Dashboard زیر 500ms روی داده آماده؛ traceهای سنگین زیر 2s، بدون احتساب cold start.

## 16. امنیت و حریم خصوصی

- `payer_card_key` یک شناسه حساس pseudonymous تلقی شود.
- مقدار کامل کارت در response عمومی نمایش داده نشود؛ mask یا hash scoped استفاده شود.
- raw file خارج از مسیرهای کنترل‌شده سرو نشود.
- authorization در سطح merchant اجباری باشد.
- admin endpointها فقط برای staff/service account باشند.
- ورودی queryها parameterized باشد.
- secretها فقط از environment دریافت شوند.
- logها نباید token، credential یا شناسه کامل مشتری را ذخیره کنند.

## 17. تست‌های الزامی

### Unit Test

- ساخت session از چند attempt
- جلوگیری از چندبار شمردن amount
- تشخیص retry و recovery
- وضعیت NoAttempt
- وضعیت Verified/Paid/Reversed
- coverage مشتری
- baseline و amount bucket
- financial impact

### Data Quality Test

- duplicate key
- inconsistent amount within session
- malformed timestamp
- missing merchant
- impossible event ordering
- unknown statuses

### Integration Test

- ingestion فایل نمونه
- ساخت factها
- refresh metricها
- API overview و trace
- merchant-level authorization

### Golden Test

یک دیتاست کوچک و دستی ساخته شود که پاسخ تمام KPIهای اصلی آن از قبل مشخص است. خروجی موتور تحلیل باید دقیقاً با اعداد مورد انتظار تطابق داشته باشد.

### Reconciliation

حداقل این برابری‌ها تست شوند:

- مجموع statusهای session برابر تعداد sessionهای معتبر
- successful + unsuccessful + excluded برابر کل sessionها
- مبلغ Dashboard با session-level source تطابق داشته باشد.
- breakdownها با total reconcile شوند؛ rounding difference مستند باشد.

## 18. Observability

- request ID برای هر درخواست
- structured logging
- زمان اجرای query
- تعداد ردیف scanشده در jobهای تحلیل
- ingestion status و خطاها
- dataset version فعال
- metric version فعال
- health check برای PostgreSQL و analytic store

## 19. مراحل پیاده‌سازی

### فاز 1: Foundation

- ایجاد Django project و تنظیمات محیطی
- PostgreSQL و Docker Compose
- Django Ninja و OpenAPI
- accounts، merchants و merchant-level permission
- health endpoint و تست پایه

### فاز 2: Data Pipeline

- schema validation فایل
- ingestion به DuckDB/Parquet
- ساخت attempt_fact و session_fact
- data quality report
- management commandهای import و refresh

### فاز 3: Metrics

- فرهنگ معیار نسخه‌دار
- daily aggregates
- overview، funnel و retry APIs
- تست reconciliation

### فاز 4: Insights

- baselineها
- تشخیص تغییر
- breakdown و financial impact
- trace و evidence API

### فاز 5: Customer Analytics

- customer_merchant_fact
- new/returning و retention
- coverage reporting

### فاز 6: Hardening

- cache
- authorization audit
- performance tests
- Docker و README
- sample environment و demo seed

## 20. خروجی‌های مورد انتظار از پیاده‌سازی

- Backend قابل اجرا
- migrationهای Django
- Docker Compose
- فایل `.env.example` بدون secret واقعی
- OpenAPI قابل مشاهده
- management command برای ingestion
- تست‌های unit و integration
- دیتاست نمونه کوچک برای تست
- README شامل setup، اجرا، ingestion، test و troubleshooting
- مستند metric definitions
- گزارش تصمیم‌های مهم و assumptionها

## 21. شروط پذیرش MVP

MVP زمانی کامل است که:

- داده بدون جمع‌زدن تکراری مبلغ در سطح session تحلیل شود.
- حداقل overview، funnel، retry و insight API کار کنند.
- هر KPI قابل trace تا تعریف، فیلتر، صورت، مخرج و evidence باشد.
- تحلیل مشتری coverage خود را نمایش دهد.
- API دسترسی merchant-level را enforce کند.
- اعداد کلیدی با تست golden و reconciliation تأیید شده باشند.
- Swagger/OpenAPI و README اجرای پروژه را برای داور ممکن کنند.
- هیچ ادعای محصولی یا علّی بدون پشتوانه داده تولید نشود.

## 22. موارد خارج از MVP

- تحلیل SKU یا کالای خاص بدون داده سفارش
- توصیه علّی قطعی
- streaming واقعی و Kafka
- Spark یا زیرساخت distributed
- مدل ML پیچیده بدون baseline قابل توضیح
- اتصال به داده زنده زرین‌پال بدون قرارداد و مجوز

