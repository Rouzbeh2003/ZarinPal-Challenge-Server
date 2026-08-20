# استاندارد Clean Code پروژه Backend

## 1. هدف

این سند قواعد اجباری کیفیت کد برای Backend تحلیلی زرین‌پال است. هدف، تولید کدی خوانا، تست‌پذیر، قابل توسعه و قابل ممیزی است. سرعت هکاتون دلیل قابل قبول برای مخلوط‌کردن لایه‌ها یا تولید محاسبات غیرقابل ردیابی نیست.

## 2. اصول پایه

1. خوانایی مهم‌تر از کوتاهی کد است.
2. صحت عددی مهم‌تر از زیبایی معماری است.
3. هر معیار باید یک منبع حقیقت داشته باشد.
4. رفتار ضمنی و magic value ممنوع است.
5. خطا نباید بی‌صدا نادیده گرفته شود.
6. کد باید برای توسعه‌دهنده‌ای که دیتاست را ندیده قابل فهم باشد.
7. بهینه‌سازی فقط بعد از اندازه‌گیری انجام شود.
8. abstraction فقط برای حذف تکرار واقعی یا تثبیت یک مرز ایجاد شود.

## 3. زبان و نام‌گذاری

- نام کد، متغیر، کلاس، function، database object و commit انگلیسی باشد.
- متن نمایشی محصول می‌تواند فارسی باشد.
- نام‌ها باید مفهوم کسب‌وکاری را بیان کنند.
- abbreviation غیرمعروف ممنوع است.
- booleanها با `is_`، `has_`، `can_` یا `should_` شروع شوند.
- collectionها نام جمع داشته باشند.
- function نام فعل داشته باشد.
- class نام اسم داشته باشد.
- unit در نام فیلد مبهم ذکر شود: `completion_time_ms`، نه `completion_time`.

نمونه خوب:

```python
successful_sessions_count
is_returning_customer
calculate_retry_recovery_rate
completion_time_ms
```

نمونه بد:

```python
x
data2
calc
status_flag
time
```

## 4. اندازه و مسئولیت

- هر function یک کار مشخص انجام دهد.
- function معمولاً زیر 30 خط نگه داشته شود؛ پیچیدگی مهم‌تر از تعداد خط است.
- class نباید چند use case نامرتبط را مدیریت کند.
- فایل‌های بسیار بزرگ به ماژول‌های مبتنی بر قابلیت شکسته شوند.
- endpoint باید thin باشد.
- modelهای Django محل قرار دادن موتور تحلیل نیستند.
- signal فقط برای side effect کوچک و کاملاً مستند استفاده شود؛ workflow اصلی با signal پنهان نشود.

## 5. جداسازی لایه‌ها

### API Layer

مسئول:

- validation ورودی
- authorization
- فراخوانی use case
- تبدیل خروجی به schema
- mapping خطا به HTTP response

غیرمسئول:

- اجرای SQL تحلیلی
- محاسبه KPI
- خواندن مستقیم فایل
- تصمیم‌گیری درباره business rule

### Service Layer

مسئول:

- اجرای use case
- orchestration بین repository و domain logic
- transaction boundary برای عملیات نوشتنی

### Domain/Metric Layer

مسئول:

- قواعد کسب‌وکار
- تعریف معیار
- محاسبات pure تا حد ممکن
- policyهای baseline و insight

### Repository Layer

مسئول:

- دسترسی به PostgreSQL، DuckDB و Parquet
- query parameterization
- برگرداندن مدل یا DTO مشخص

repository نباید متن UI یا پیشنهاد اقدام تولید کند.

## 6. Dependency Direction

وابستگی باید به سمت منطق پایدارتر باشد:

```text
API → Services → Domain
             ↘ Repository Interfaces
Infrastructure → Repository Implementations
```

- Domain نباید به Django request، HTTP status یا serializer وابسته باشد.
- محاسبه معیار نباید بداند نتیجه در React چگونه نمایش داده می‌شود.
- infrastructure detail نباید در تمام کد پخش شود.

## 7. Function Design

- ورودی و خروجی function مشخص و type-hinted باشد.
- mutation پنهان ممنوع است.
- functionهای محاسباتی ترجیحاً pure باشند.
- بیش از 4 پارامتر مرتبط را در یک dataclass یا value object قرار دهید.
- boolean positional argument ممنوع است؛ از keyword یا strategy استفاده شود.
- early return برای کاهش nesting مجاز و مطلوب است.
- nesting عمیق‌تر از سه سطح بازطراحی شود.

نمونه نامناسب:

```python
calculate(data, True, False, 2)
```

نمونه مناسب:

```python
calculate_metric(dataset, calculation_policy)
```

## 8. Type Safety

- تمام public functionها type hint کامل داشته باشند.
- از `Any` فقط در مرز کتابخانه ناشناخته و همراه توضیح استفاده شود.
- برای داده‌های ساختاریافته از Pydantic model، dataclass یا TypedDict استفاده شود.
- dictهای بدون قرارداد بین لایه‌ها جابه‌جا نشوند.
- statusها و metric nameها Enum باشند.
- مبلغ integer باشد و currency جداگانه نگه‌داری شود.
- درصد در domain عدد بین صفر و یک باشد.
- timezone-aware datetime استفاده شود.

## 9. Error Handling

- `except Exception: pass` ممنوع است.
- exceptionها بر اساس domain تعریف شوند.
- خطای ورودی، دسترسی، نبود داده و خطای infrastructure از هم جدا باشند.
- پیام داخلی دیتابیس مستقیماً به client داده نشود.
- هر خطای API یک `request_id` و error code پایدار داشته باشد.
- retry فقط برای خطاهای transient و با سقف مشخص انجام شود.
- fallback نباید صحت عدد را قربانی کند؛ نبود نتیجه بهتر از عدد اشتباه است.

## 10. قواعد Django

- settings برای development، test و production جدا باشد.
- secret در repository قرار نگیرد.
- migrationها همراه تغییر model commit شوند.
- queryهای ORM در loop بررسی و از N+1 جلوگیری شود.
- برای عملیات چندمرحله‌ای نوشتنی از transaction استفاده شود.
- business rule در admin، serializer یا template پنهان نشود.
- model method فقط رفتار طبیعی همان entity را داشته باشد.
- custom manager/queryset برای queryهای تکراری و خوانا استفاده شود.
- دسترسی merchant-level در service/repository enforce و در API دوباره بررسی شود.

## 11. قواعد Django Ninja API

- برای هر request و response، Schema صریح وجود داشته باشد.
- response shape بدون versioning شکسته نشود.
- endpointها بر اساس resource/use case نام‌گذاری شوند، نه نام صفحه React.
- pagination برای collectionها الزامی است.
- filterها type-safe و allowlisted باشند.
- HTTP status code درست استفاده شود.
- خطاها ساختار یکسان داشته باشند.
- OpenAPI description برای endpointهای غیرواضح نوشته شود.
- مثال response برای insight و trace در مستندات API وجود داشته باشد.

## 12. SQL و تحلیل داده

- SQLها در فایل‌های نام‌دار یا repositoryهای مشخص قرار گیرند.
- query چندخطی پیچیده داخل endpoint ممنوع است.
- همه پارامترها parameterized باشند.
- `SELECT *` در queryهای production ممنوع است.
- سطح grain هر query در comment بالای آن نوشته شود.
- join keyها صریح باشند.
- قبل و بعد از join، خطر افزایش تعداد ردیف بررسی شود.
- مبلغ فقط در grain صحیح جمع شود.
- division by zero صریح مدیریت شود.
- null handling باید بخشی از تعریف معیار باشد.
- rounding فقط در presentation boundary انجام شود.
- timezone conversion یک بار و در مرز مشخص انجام شود.

Comment نمونه برای SQL:

```sql
-- Grain: one row per merchant_key and metric_date
-- Source: session_fact; each session_key is counted once
```

## 13. تعریف معیارها

هر معیار باید شامل این metadata باشد:

- name
- version
- human-readable definition
- grain
- numerator
- denominator
- inclusion rules
- exclusion rules
- null policy
- required columns
- minimum sample size
- tests

یک معیار نباید در چند endpoint با فرمول‌های متفاوت پیاده‌سازی شود.

## 14. Constants و Configuration

- magic number ممنوع است.
- thresholdها در policy یا configuration نسخه‌دار نگه‌داری شوند.
- مقدارهای environment با startup validation بررسی شوند.
- defaultهای مهم باید صریح و مستند باشند.
- threshold آماری یا تجاری بدون نام و توضیح وارد فرمول نشود.

بد:

```python
if sample_size > 30 and change > 0.05:
```

خوب:

```python
if sample_size >= policy.minimum_sample_size:
```

## 15. Comments و Documentation

- comment باید «چرا» را توضیح دهد، نه تکرار «چه کاری» که کد انجام می‌دهد.
- workaround، assumption و محدودیت داده comment یا ADR داشته باشد.
- کد مرده و commentشده حذف شود؛ history در Git وجود دارد.
- public service و محاسبات پیچیده docstring داشته باشند.
- فرمول معیار مهم در docstring یا metric registry ثبت شود.
- TODO باید owner/reason یا issue reference داشته باشد.

## 16. Logging

- log ساختاریافته باشد.
- از `print` در کد application استفاده نشود.
- log شامل context مفید مانند request_id، merchant_key، job_id و dataset_version باشد.
- اطلاعات حساس و `payer_card_key` کامل log نشود.
- برای exception از stack trace مناسب استفاده شود.
- شروع و پایان jobهای ingestion و analytics همراه duration ثبت شود.

## 17. Testing Standard

- الگوی Arrange، Act، Assert رعایت شود.
- هر bug fix ابتدا یا هم‌زمان regression test داشته باشد.
- تست‌ها deterministic باشند.
- test نباید به ترتیب اجرای testهای دیگر وابسته باشد.
- از mock برای domain logic استفاده نشود؛ فقط boundaryهای خارجی mock شوند.
- fixtureها کوچک و هدفمند باشند.
- برای محاسبات، edge caseهای null، zero، duplicate، reversed و multi-attempt پوشش داده شوند.
- assertion کلی مانند «response موفق بود» کافی نیست؛ عدد و قرارداد بررسی شود.
- snapshot test جای assertion معنایی را نگیرد.

نام تست باید رفتار را بیان کند:

```python
def test_session_amount_is_counted_once_when_payment_has_multiple_attempts():
    ...
```

## 18. کیفیت تست مورد انتظار

به‌جای تمرکز صرف بر درصد coverage:

- تمام metric definitionها تست شوند.
- تمام branchهای status resolution تست شوند.
- authorization و tenant isolation تست شوند.
- reconciliation total و breakdown تست شود.
- حداقل یک golden dataset برای کل pipeline وجود داشته باشد.
- endpointهای اصلی integration test داشته باشند.

Coverage بالا با assertion ضعیف قابل قبول نیست.

## 19. Performance Rules

- ابتدا query و زمان پاسخ اندازه‌گیری شود.
- aggregationهای تکراری precompute شوند.
- از خواندن CSV در request جلوگیری شود.
- response حجیم pagination یا aggregation شود.
- query timeout تعریف شود.
- cache key تمام ورودی‌های مؤثر بر نتیجه را شامل شود.
- invalidation cache بعد از dataset refresh تست شود.
- memory limit و thread count DuckDB در configuration باشد.

## 20. امنیت

- اصل least privilege رعایت شود.
- authorization فقط به پنهان‌کردن دکمه در React واگذار نشود.
- شناسه merchant از token/session کاربر اعتبارسنجی شود.
- raw SQL فقط parameterized باشد.
- CORS به originهای مورد نیاز محدود شود.
- rate limiting برای endpointهای سنگین در نظر گرفته شود.
- dependencyها lock شوند و vulnerability scanning دوره‌ای انجام شود.
- `.env` واقعی، فایل دیتاست و database file در Git قرار نگیرند.

## 21. Git و Commit

- هر commit یک تغییر منطقی داشته باشد.
- پیام commit روشن و imperative باشد.
- generated file غیرضروری commit نشود.
- migration مرتبط با تغییر model در همان PR باشد.
- refactor و تغییر رفتار تا حد ممکن جدا شوند.
- قبل از commit: format، lint، type check و test اجرا شوند.

نمونه:

```text
Add session-level retry recovery metric
Fix duplicate amount aggregation in payment funnel
```

## 22. Pull Request Checklist

- [ ] تغییر با نیاز محصول مرتبط است.
- [ ] مرز لایه‌ها رعایت شده است.
- [ ] endpoint فاقد business logic سنگین است.
- [ ] type hint و Schema کامل‌اند.
- [ ] queryها parameterized هستند.
- [ ] grain محاسبات مشخص است.
- [ ] امکان double counting بررسی شده است.
- [ ] null و zero handling مشخص است.
- [ ] تست مثبت، منفی و edge case وجود دارد.
- [ ] اعداد با source reconcile شده‌اند.
- [ ] log حاوی داده حساس نیست.
- [ ] README/OpenAPI در صورت نیاز به‌روز شده‌اند.
- [ ] migration و rollback impact بررسی شده‌اند.
- [ ] Ruff، mypy و pytest موفق‌اند.

## 23. Definition of Done

یک قابلیت زمانی Done است که:

- behavior مورد انتظار پیاده‌سازی شده باشد.
- قرارداد API مشخص و مستند باشد.
- authorization اعمال شده باشد.
- تست مناسب نوشته و اجرا شده باشد.
- عدد خروجی قابل trace و reconcile باشد.
- خطا و حالت نبود داده مدیریت شده باشد.
- performance متناسب با endpoint بررسی شده باشد.
- logging و observability کافی باشد.
- کد lint، format و type check را پاس کند.
- مستندات مرتبط به‌روز شده باشند.

## 24. قواعد ویژه تولید کد با AI

هنگام استفاده از این سند برای تولید کد:

1. ابتدا ساختار موجود repository و فایل‌های راهنما بررسی شود.
2. تغییرات کاربر حفظ و فایل‌های نامرتبط دست‌کاری نشوند.
3. پیش از پیاده‌سازی، assumptionهای مهم اعلام شوند.
4. کد placeholder به‌عنوان قابلیت کامل تحویل داده نشود.
5. هیچ عدد نمونه به‌عنوان خروجی واقعی تحلیل hardcode نشود.
6. dependency جدید فقط با دلیل روشن اضافه شود.
7. migration، test، README و `.env.example` همراه قابلیت ساخته شوند.
8. پس از تغییر، تست‌های مرتبط واقعاً اجرا شوند.
9. خطاهای تست پنهان یا دور زده نشوند.
10. نتیجه نهایی شامل فایل‌های تغییرکرده، تست‌های اجراشده و محدودیت‌های باقی‌مانده باشد.

