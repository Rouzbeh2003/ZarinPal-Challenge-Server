# فرانت‌اند — داشبورد تحلیل پرداخت زرین‌پال

داشبورد تحلیلی پذیرندگان زرین‌پال — فارسی/RTL، تم تیره، مبتنی بر React 19 + Vite + TypeScript + Tailwind CSS v4 + Shadcn UI.

> **وضعیت:** به Backend Django متصل است و داده‌های داشبورد از دیتاست واقعی تراکنش‌ها می‌آیند. فایل‌های `src/mocks/` فقط برای حالت آفلاین نگه داشته شده‌اند و در جریان عادی استفاده نمی‌شوند.

## اجرای محلی

روش پیشنهادی برای دمو: اجرای کل استک از ریشه پروژه با Docker (فرانت با nginx سرو می‌شود؛ به Node نیاز نیست):

```powershell
docker compose up --build -d   # از ریشه پروژه → داشبورد روی http://localhost:5173
```

توسعه با hot-reload (نیازمند Node.js 20+)؛ ابتدا `docker compose stop frontend` را اجرا کنید تا تداخل پورت پیش نیاید:

```bash
npm install        # نصب وابستگی‌ها (یک‌بار)
npm run dev        # سرور توسعه → http://localhost:5173
```

Build تولید:

```bash
npm run build      # tsc (تایپ‌چک) + vite build → خروجی در dist/
```

## Docker

`Dockerfile` دو مرحله‌ای است: مرحله build با Node اپ را کامپایل می‌کند و مرحله serve با nginx فایل‌های استاتیک را سرو می‌کند و مسیر `/api/` را به سرویس backend در Compose پروکسی می‌کند. تنظیمات nginx در `docker/nginx.conf` است؛ مسیرهای ناشناخته به `index.html` برمی‌گردند (SPA routing).

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

## مرز داده و اتصال Backend

- **قراردادها:** همه انواع در `src/api/types.ts` تعریف شده‌اند و با `BACKEND_IMPLEMENTATION_SPEC.md` هماهنگ‌اند (درصد بین ۰ و ۱، مبلغ integer با currency، severity محدود، ساختار trace).
- **آداپتر:** صفحات فقط از `src/api/adapter.ts` داده می‌گیرند؛ این فایل به API واقعی Django با JWT متصل است (Bearer + رفرش خودکار توکن) و پاسخ‌های Snake_case را به types نگاشت می‌کند.
- **احراز هویت:** در توسعه، ورود خودکار با `demo-session` انجام می‌شود؛ برای تولید `login/refresh` در نظر گرفته شده است.
- **مسیرهای API** (پیاده‌سازی‌شده در Backend):

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

- Vite dev server معمولاً روی `http://localhost:5173` بالا می‌آید؛ در Docker، nginx همان پورت را از کانتینر سرو می‌کند.
- Build تولید با روتر `BrowserRouter` کار می‌کند؛ در Docker، nginx مسیرهای ناشناخته را به `index.html` برمی‌گرداند.
- برای استقرار بدون Compose نیز `npm run build` و سرو کردن پوشه `dist/` با هر وب‌سرور استاتیک (با rewrites) کافی است.