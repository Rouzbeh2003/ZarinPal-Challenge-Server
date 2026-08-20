# فرانت‌اند — داشبورد تحلیل پرداخت زرین‌پال

داشبورد تحلیلی پذیرندگان زرین‌پال — فارسی/RTL، تم تیره، مبتنی بر React 19 + Vite + TypeScript + Tailwind CSS v4 + Shadcn UI.

> ⚠️ **وضعیت:** تمام داده‌های فعلی «نمایشی» (mock) هستند و نباید به‌عنوان تحلیل واقعی تراکنش نمایش داده شوند. هیچ Backend یا API واقعی هنوز متصل نشده است.

## اجرای محلی

```bash
npm install        # نصب وابستگی‌ها (یک‌بار)
npm run dev        # سرور توسعه → http://localhost:5173
```

Build تولید:

```bash
npm run build      # tsc (تایپ‌چک) + vite build → خروجی در dist/
```

## محتوا و صفحات

| مسیر | صفحه | وضعیت |
| --- | --- | --- |
| `/` | نمای کلی (KPI + روند + سلامت + بینش‌ها) | کامل (mock) |
| `/payment-health` | سلامت پرداخت و قیف | کامل (mock) |
| `/retry-analysis` | تحلیل تلاش مجدد | کامل (mock) |
| `/insights` | فهرست بینش‌ها (فیلتر بر اساس شدت) | کامل (mock) |
| `/insights/:id` | جزئیات بینش (اثر مالی، عوامل، اقدام‌ها) | کامل (mock) |
| `/insights/:id/trace` | ردیابی محاسبه بینش | کامل (mock) |
| `/trace` | ردیابی محاسبه معیار (تعریف، فیلتر، شواهد) | کامل (mock) |
| `/design` | نمایشگاه سیستم طراحی | داخلی |

## ساختار پروژه

```text
src/
├── api/
│   ├── types.ts          # قراردادهای TypeScript (مرز داده، هماهنگ با Backend)
│   └── adapter.ts        # لایه دسترسی داده ← همین‌جا برای اتصال API تغییر می‌کند
├── mocks/                # فیکسچرهای فارسی نمایشی (داده واقعی نیست)
│   ├── index.ts
│   ├── merchants.ts
│   ├── overview.ts
│   ├── insights.ts
│   ├── retry.ts
├── components/
│   ├── ui/               # کامپوننت‌های Shadcn (button, card, select, ...)
│   ├── charts/           # نمودار خطی SVG سبک (بدون وابستگی خارجی)
│   ├── dashboard/        # کارت‌ها، جداول و ویجت‌های صفحات
│   └── layout/           # App Shell، Sidebar، MobileNav، TopBar
├── pages/                # صفحات (overview, payment-health, retry, insights, trace)
└── lib/
    ├── navigation.ts     # منبع حقیقت مسیرها و آیتم‌های ناوبری
    ├── global-filters.tsx# Context فیلترهای سراسری (بازه زمانی و پذیرنده)
    ├── severity.ts       # متادیتای severity (برچسب، رنگ، ترتیب)
    └── utils.ts          # تابع cn
```

## مرز داده و اتصال Backend آینده

- **قراردادها:** همه انواع در `src/api/types.ts` تعریف شده‌اند و با `BACKEND_IMPLEMENTATION_SPEC.md` هماهنگ‌اند (درصد بین ۰ و ۱، مبلغ integer با currency، severity محدود، ساختار trace).
- **آداپتر:** صفحات فقط از `src/api/adapter.ts` داده می‌گیرند (`getOverview`, `getPaymentHealth`, `getRetryAnalysis`, `getInsights`, `getInsightDetail`, `getTrace`). الان همگی از `src/mocks/` می‌خوانند.
- **اتصال واقعی:** برای وصل‌کردن Backend، فقط همین فایل `adapter.ts` را با `fetch` به API واقعی بازنویسی کنید؛ شکل خروجی (types) ثابت می‌ماند و صفحات بدون تغییر کار می‌کنند.

مسیرهای API آینده (طبق سند Backend):

```text
GET /api/v1/merchants
GET /api/v1/merchants/{merchant_key}/overview
GET /api/v1/merchants/{merchant_key}/payment-health
GET /api/v1/merchants/{merchant_key}/funnel
GET /api/v1/merchants/{merchant_key}/retry-analysis
GET /api/v1/merchants/{merchant_key}/insights
GET /api/v1/insights/{insight_id}
GET /api/v1/insights/{insight_id}/trace
```

## قراردادهای طراحی

- فارسی و RTL؛ فونت `Vazirmatn Variable` (محلی)؛ تم تیره (dark-only).
- آیکون‌ها فقط از Lucide؛ اعداد با `toLocaleString("fa-IR")` فارسی می‌شوند.
- کامپوننت‌ها دکمه حداقل 44px، focus ring فعال، و حالت‌های بارگذاری/خطا/خالی جداگانه دارند.
- منو موبایل به‌صورت `<details>` ساده باز می‌شود و روی لایه‌های بالاتر قرار می‌گیرد.

## نکات فنی

- Vite dev server معمولاً روی `http://localhost:5173` بالا می‌آید.
- Build تولید با روتر `BrowserRouter` فرض می‌شود (برای هاست استاتیک، rewrites لازم است).
- برای استقرار واقعی، `npm run build` و سرو کردن پوشه `dist/` کافی است.