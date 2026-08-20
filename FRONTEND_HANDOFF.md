# سند تحویل فرانت‌اند — وضعیت فعلی

**پروژه:** داشبورد تحلیل پرداخت زرین‌پال
**تاریخ:** 2026-08-20
**دامنه این سند:** فقط کارهای انجام‌شده تا پایان Task 4 فرانت‌اند؛ هیچ Backend یا API واقعی پیاده‌سازی نشده است.

## 1. وضعیت اجرایی

فرانت‌اند در مسیر `frontend/` قرار دارد و با React، Vite، TypeScript، Tailwind CSS v4 و Shadcn UI آماده شده است.

برای اجرای محلی:

```powershell
cd D:\documents\Ahackathon\zarinpal\frontend
npm run dev
```

سپس آدرس نمایش‌داده‌شده توسط Vite (معمولاً `http://localhost:5173`) را در مرورگر باز کنید. برای build نهایی:

```powershell
npm run build
```

آخرین build در زمان تحویل Task 2 موفق بوده است. build پس از Task 3 به‌دلیل عدم دسترسی محیط اجرا (VM با خطای VM_DISK_SPACE_INSUFFICIENT) هنوز اجرا نشده؛ به‌محض دسترسی باید `npm run build` اجرا و نتیجه تأیید شود.

## 2. تصمیم‌های قطعی

- **زبان رابط:** فارسی و RTL.
- **نوع محصول:** داشبورد تحلیلی پرداخت؛ فعلاً مستقل از Backend.
- **پشته:** React + Vite + TypeScript + Tailwind CSS v4 + Shadcn UI + react-router-dom (v7).
- **فونت:** `Vazirmatn Variable` به‌صورت محلی از پکیج `@fontsource-variable/vazirmatn`؛ به فونت نصب‌شده کاربر وابسته نیست.
- **تم:** dark data console با پس‌زمینه navy/slate، رنگ amber برای اقدام/تمرکز و destructive برای خطا. light mode خارج از scope.
- **آیکون‌ها:** فقط Lucide؛ emoji در رابط استفاده نمی‌شود.
- **داده:** تمام محتوای فعلی صرفاً نمایشی است و نباید به‌عنوان تحلیل واقعی تراکنش نمایش داده شود.
- **مسیرهای ناوبری:** منبع حقیقت `src/lib/navigation.ts` است؛ برای افزودن صفحه، فقط این ماژول و روت‌های `app.tsx` تغییر می‌کنند.
- **فیلترهای سراسری:** منبع حقیقت `src/lib/global-filters.tsx` است (Context + کنترل‌های Select).

## 3. کارهای تکمیل‌شده

### Task 1 — Foundation

- تبدیل starter اولیه Vite از TypeScript ساده به React + TypeScript.
- پیکربندی Vite برای React، Tailwind و alias `@/`.
- تنظیم سراسری `lang="fa"` و `dir="rtl"`.
- توکن‌های ظاهری dark theme در `src/style.css` و فونت سراسری Vazirmatn.
- فایل پیکربندی Shadcn UI، کامپوننت پایه `Button` و utility تابع `cn`.

### Task 2 — Design System

کامپوننت‌های Shadcn: `Alert`، `Badge`، `Button`، `Card`، `Input`، `Select`، `Skeleton`، `Tabs`، `Tooltip`.
کامپوننت اختصاصی `DataState` برای سه وضعیت `loading`، `empty` و `error`.
صفحه فعلی (`/design`) نمایشگاه داخلی Design System است.

### Task 3 — Application Shell (کامل)

- **Routing:** ۵ صفحه با مسیرهای منبع‌حقیقت `appRoutes` (overview=/، payment-health، retry-analysis، insights، trace) + مسیر `/design` + fallback `*`.
- **Sidebar راست (دسکتاپ `lg:block`):** دو بخش «تحلیل» و «اعتبارسنجی»؛ وضعیت active با `aria-current="page"`؛ برند نمایشی زرین‌پال (Mark صاعقه با Zap از Lucide — لوگوی واقعی هنوز اضافه نشده).
- **MobileNav (موبایل):** دکمه منو → Dialog تمام‌صفحه (Radix) با ناوبری فارسی؛ دکمه جست‌وجوی غیرفعال (شکل بدون action) با aria-label صریح.
- **TopBar:** نشان «داده نمایشی»، کنترل بازه زمانی و انتخاب پذیرنده به‌صورت نمایشی (Select)، دکمه icon-only شاخص سلامت با Tooltip و aria-label.
- **GlobalFilterProvider:** Context با `dateRangePreset` (۷/۳۰/۹۰ روز/دلخواه) و `merchantKey` — فقط state نمایشی، هنوز به داده متصل نیست.
- **PageHeader:** عنوان و توضیح هر صفحه از منبع ناوبری.
- **PagePlaceholder:** کامپوننت «در حال ساخت» با ماژول‌های برنامه‌ریزی‌شده هر صفحه + نشان فیلترهای فعلی — تضمین می‌کند هیچ صفحه‌ای به‌عنوان کامل تحویل داده نشود.
- **پنج صفحه placeholder:** overview، payment-health، retry-analysis، insights و trace — هر کدام با شرح ماژول‌های برنامه‌ریزی‌شده (Task 5 تا 9).

### Task 11 — README و تحویل نهایی (کامل)

- **`frontend/README.md`** ساخته شد: معرفی، نحوه اجرا، جدول صفحات، ساختار پروژه، مرز داده و نحوه اتصال Backend آینده، قراردادهای طراحی و نکات فنی.
- **Build نهایی موفق:** `npm run build` اجرا و بدون خطا تمام شد (tsc + vite build، ۲۵۰۰+ ماژول). خروجی: `dist/` (JS ~452KB / gzip 137KB).
- **رفع خطاهای تایپ build:** ۱۴ خطای تایپ در ۵ فایل رفع شد (variant `ghost` در Button، پارامترهای بلااستفاده در adapter با `_`، فیلد `currency` در مocks، import بلااستفاده).
- **`FRONTEND_HANDOFF.md`** این سند به‌روزرسانی شد.

### Task 10 — Responsive و کیفیت (کامل)

- **RTL نمودارها:** `LineChart` نقاط را برعکس می‌کند تا قدیمی‌ترین در راست و جدیدترین در چپ باشد (منطبق بر جهت RTL)؛ برچسب‌های TrendChart هم همراستا شدند.
- **reduced-motion:** media query `prefers-reduced-motion` در `style.css` — حرکت و transitionها برای کاربران حساس به حرکت غیرفعال می‌شوند.
- **استاندارد 44px:** همه دکمه‌های سفارشی باقی‌مانده (چیپ فیلتر severity و دکمه جزئیات) به `min-h-11` یا Button استاندارد ارتقا یافتند.
- **یکدستی لیست بینش‌ها:** `line-clamp-2` برای خلاصه — ارتفاع کارت‌ها یکدست.
- **منوی موبایل (رفع باگ):** منوی قبلی زیر TopBar باز می‌شد و دسترسی به آیتم‌ها را می‌گرفت؛ حالا به‌صورت یک لایه تمام‌صفحه (fixed + z بالا) بالای هدر باز می‌شود، با دکمه بستن و Escape.
- **بازبینی responsive:** جدول‌ها overflow-x-auto دارند؛ gridها breakpoint دارند؛ سایدبار در موبایل hidden و MobileNav فعال است؛ نمودارها در عرض کوچک اسکرول افقی می‌شوند.
- **دسترس‌پذیری:** focus ring روی همه تعامل‌ها؛ `aria-pressed` چیپ‌ها؛ `aria-label` دکمه‌های icon-only؛ `th scope` جداول.

### Task 9 — Trace و Evidence (کامل)

- **TraceDetail:** ۴ کارت: تعریف معیار (نام، نسخه، سطح محاسبه، نسخه دیتاست، ingestion، قالب query) + صورت و مخرج با فرمول‌های انسانی + فیلترهای اعمال‌شده (چیپ‌ها) + پوشش داده/رکوردهای ورودی/خروجی/حذف‌شده با دلایل حذف.
- **EvidenceTable:** جدول شواهد (وضعیت، sessionKey، trySeq، مبلغ، PSP، بانک، زمان تأیید، شامل/حذف با دلیل) + pagination ساده (۵ در صفحه) و دکمه‌های صفحه با aria-label.
- **صفحه Trace:** خواندن از `getTrace`؛ ناحیه سهم عوامل (breakdown contribution) با هشدار «نسبت‌ها رابطه علّی قطعی را اثبات نمی‌کنند»؛ حالت‌های loading/error.
- **روتینگ:** مسیر `/insights/:insightId/trace` اضافه شد؛ `getInsightTracePath` در navigation.ts؛ صفحه جزئیات بینش به ردیابی همان بینش لینک می‌دهد.
- فایل‌های جدید: `components/dashboard/{trace-detail,evidence-table}.tsx`؛ بازنویسی: `pages/trace-page.tsx`.

### Task 8 — Insights Experience (کامل)

- **ماژول `lib/severity.ts`:** متادیتای مشترک severity (برچسب فارسی + کلاس‌های رنگی)، ترتیب اولویت و گزینه‌های فیلتر — تکرار در recent-insights حذف شد و به آن وصل شد.
- **صفحه Insights (لیست):** فیلتر چیپ‌های severity با `aria-pressed` و شمارنده هر severity؛ مرتب‌سازی پیش‌فرض بر اساس شدت سپس اثر مالی؛ کارت هر بینش (severity badge، خلاصه، اثر مالی تقریبی، اطمینان) با دکمه «جزئیات و اقدام‌ها»؛ حالت empty با DataState.
- **صفحه Insight Detail (`/insights/:id`):** از `getInsightDetail`؛ ۴ کارت معیار (فعلی/پایه/تغییر مطلق/تغییر نسبی با رنگ مثبت-منفی)، اثر مالی با روش تخمین، عوامل مرتبط با نوار سهم، اقدام‌های پیشنهادی شماره‌دار، و ناحیه اعتبار (اطمینان، پوشش، بازه) + لینک trace.
- **روتینگ:** مسیر فرزند `/insights/:insightId` در app.tsx؛ `findNavigationItem` مسیرهای فرزند را به والد نگاشت می‌کند؛ `getInsightPath` در lib/navigation.
- **Overview** به جزئیات بینش متصل شد (`navigate(getInsightPath(id))`).
- فایل‌های جدید: `lib/severity.ts`، `pages/insight-detail-page.tsx`؛ بازنویسی: `pages/insights-page.tsx`، `pages/overview-page.tsx` (اتصال)، `app.tsx` (روت).

### Task 7 — Retry Analysis (کامل)

- **قرارداد:** `RetryBreakdownRow` به types.ts اضافه شد (PSP، بانک صادرکننده، کد پاسخ سوئیچ، تعداد سشن/تلاش مجدد/بازیابی‌شده، مبلغ بازیابی، نرخ بازیابی)؛ `breakdown: RetryBreakdownRow[]` به `RetryAnalysis` اضافه شد و mock تکمیل شد.
- **RetryCards:** ۴ کارت (نرخ تلاش مجدد، نرخ بازیابی، مبلغ بازیابی‌شده، مبلغ در معرض ازدست‌رفتن) با آیکون و تغییر نسبت به دوره قبل؛ «در معرض ازدست‌رفتن» با رنگ قرمز و یادداشت «بالقوه — زیان قطعی نیست».
- **RetryBreakdownTable:** جدول تفکیکی فارسی/دسترسی‌پذیر (thead با `th scope`، overflow-x برای موبایل) با ستون‌های PSP/بانک/کد پاسخ/سشن‌ها/با تلاش مجدد/بازیابی‌شده/نرخ بازیابی/مبلغ بازیابی‌شده + توضیح.
- **صفحه RetryAnalysis:** خواندن از `getRetryAnalysis`؛ حالت‌های loading/error؛ ناحیه توضیح (تعریف نرخ تلاش مجدد و بازیابی و هشدار بالقوه بودن مبلغ).
- فایل‌های جدید: `components/dashboard/{retry-cards,retry-breakdown-table}.tsx`؛ صفحه `pages/retry-analysis-page.tsx` بازنویسی.

### Task 6 — Payment Health و Funnel (کامل)

- **PspComparison:** مقایسه PSPها با میله‌های افقی RTL (سهم سشن‌ها + نرخ موفقیت + وضعیت پایدار/توجه/بحرانی) و «مبلغ در معرض ازدست‌رفتن» هر PSP.
- **FunnelChart:** قیف پرداخت ۵ مرحله‌ای (شروع → انتقال به بانک → تلاش واقعی → تأیید → تسویه) با افت درصدی بین مراحل.
- **صفحه PaymentHealth:** ۳ کارت (نرخ موفقیت کل، مبلغ در معرض ازدست‌رفتن با هشدار «زیان قطعی نیست»، سشن‌های معتبر) + مقایسه PSP + قیف؛ خواندن از `getPaymentHealth`؛ حالت‌های loading و error.
- **قرارداد:** فیلد `atRiskAmount` به `pspBreakdown` در types.ts و mocks اضافه شد.
- مقادیر «در معرض ازدست‌رفتن» در همه قسمت‌ها به‌صورت صریح از زیان قطعی تفکیک شده‌اند (طبق سند Backend).

### Task 5 — Overview Dashboard (کامل)

- **KpiCard:** ۴ کارت (فروش موفق، نرخ موفقیت، نرخ تلاش مجدد، مبلغ در معرض ازدست‌رفتن) با نمایش تغییر نسبت به دوره قبل (فلش سبز/قرمز/خنثی) و اعداد فارسی.
- **TrendChart (SVG دستی):** کامپوننت `LineChart` در `src/components/charts/line-chart.tsx` (بدون dependency جدید) — انتخاب کاربر: SVG دستی به‌جای Recharts (بدون نصب)؛ نمودار روند نرخ موفقیت با برچسب روزهای فارسی.
- **HealthSummary:** نرخ موفقیت کل، تغییر نسبت به دوره قبل، تعداد PSPهای پایدار/توجه/بحرانی + «مبلغ در معرض ازدست‌رفتن (بالقوه)» با هشدار شفاف.
- **RecentInsights:** بینش‌های اخیر با severity badge و اثر مالی؛ کلیک → آماده‌سازی برای Task 8.
- **خواندن داده از آداپتر:** `getOverview` + `getPaymentHealth` + `getInsights` با `Promise.all`؛ حالت loading (Skeleton)، error (DataState + تلاش دوباره)؛ empty تعریف‌شده (کارت خالی برای بینش‌ها).
- فایل‌های جدید: `components/charts/line-chart.tsx`، `components/dashboard/{kpi-card,trend-chart,health-summary,recent-insights}.tsx`؛ صفحه `pages/overview-page.tsx` بازنویسی کامل.

- **قراردادهای TypeScript** در `src/api/types.ts`: `Merchant`، `KpiMetric`، `FunnelStage`، `RetryAnalysis`، `Insight` (دقیقاً طبق قرارداد استاندارد سند Backend بخش ۱۲)، `Trace` (بخش ۱۳)، `Overview`، `PaymentHealth`، `ApiError`، `DateRange`.
  - قواعد: درصد بین صفر و یک؛ مبلغ integer با currency جدا؛ `severity` از union محدود (`low|medium|high|critical`)؛ شمارش یک‌باره `session_key`؛ تفکیک «مبلغ در معرض ازدست‌رفتن» از زیان قطعی.
- **فیکسچرهای فارسی mock** در `src/mocks/`: `merchants.ts` (۳ پذیرنده ساختگی)، `insights.ts` (۳ بینش با severity/اثر مالی + trace با evidence و exclusionReasons)، `overview.ts` (KPIها + trend + recentInsights)، `retry.ts`، و `index.ts` به‌عنوان خروجی مرکزی.
  - ⚠️ همه data «نمایشی» است و در کد/file کامنت هشدار دارد.
- **لایه Adapter** در `src/api/adapter.ts`: فانکشن‌های async هم‌نام با APIهای آینده (`getMerchants`، `getOverview`، `getPaymentHealth`، `getFunnel`، `getRetryAnalysis`، `getInsights`، `getInsightDetail`، `getInsightTrace`، `getTrace`) که الان از mocks می‌خوانند. برای اتصال به Django فقط این فایل تغییر می‌کند؛ صفحات بدون تغییر می‌مانند.
- **گیت:** کارهای Task 4 در یک commit واحد ثبت شدند (Commit 2).

## 4. فایل‌های کلیدی

```text
frontend/
├── components.json                 # تنظیمات Shadcn UI
├── package.json                    # scripts و وابستگی‌ها
├── vite.config.ts                  # React، Tailwind و alias @/
├── index.html                      # HTML فارسی/RTL
└── src/
    ├── app.tsx                     # روت‌ها و AppShell (روتینگ react-router-dom)
    ├── main.tsx                    # React root + BrowserRouter
    ├── style.css                   # توکن‌های تم و font سراسری
    ├── lib/
    │   ├── utils.ts                # تابع cn
    │   ├── navigation.ts           # منبع حقیقت مسیرها و آیتم‌های ناوبری
    │   ├── global-filters.tsx      # Context فیلترهای سراسری + کنترل‌های Select
    │   └── severity.ts             # متادیتای مشترک severity (برچسب، رنگ، ترتیب)
    ├── api/
    │   ├── types.ts                # قراردادهای TypeScript (مرز داده، هماهنگ با Backend)
    │   └── adapter.ts              # لایه data access (mock امروز، fetch به Django در آینده)
    ├── mocks/
    │   ├── index.ts                # خروجی مرکزی فیکسچرها
    │   ├── merchants.ts            # پذیرنده‌های ساختگی
    │   ├── insights.ts             # بینش‌ها + trace
    │   ├── overview.ts             # KPIها + trend + recentInsights
    │   └── retry.ts                # تحلیل تلاش مجدد
    ├── components/
    │   ├── design-system-showcase.tsx
    │   ├── charts/
    │   │   └── line-chart.tsx          # نمودار خطی SVG سبک (بدون وابستگی)
    │   ├── dashboard/
    │   │   ├── kpi-card.tsx            # کارت KPI + Skeleton
    │   │   ├── trend-chart.tsx         # نمودار روند (پوسته LineChart)
    │   │   ├── health-summary.tsx      # خلاصه سلامت پرداخت
    │   │   ├── recent-insights.tsx     # لیست بینش‌های اخیر
    │   │   ├── psp-comparison.tsx      # مقایسه PSP (میله‌ای RTL)
    │   │   ├── funnel-chart.tsx        # قیف پرداخت
    │   │   ├── retry-cards.tsx         # کارت‌های تحلیل تلاش مجدد
    │   │   ├── retry-breakdown-table.tsx # جدول تفکیکی تلاش مجدد
    │   │   ├── trace-detail.tsx        # تعریف معیار/فیلتر/پوشش trace
    │   │   ├── evidence-table.tsx      # جدول شواهد با pagination
    │   │   └── insight-llm-advice.tsx  # تکمیل اقدام‌های بینش با نظر LLM
    │   ├── layout/
    │   │   ├── app-shell.tsx       # چیدمان کلی: Sidebar + MobileNav + TopBar + PageHeader
    │   │   ├── sidebar.tsx         # سایدبار دسکتاپ
    │   │   ├── mobile-nav.tsx      # منوی موبایل (details بومی + لایه بالا)
    │   │   ├── top-bar.tsx         # هدر بالا + کنترل‌های mock
    │   │   └── page-placeholder.tsx# الگوی صفحه در حال ساخت
    │   └── ui/                     # کامپوننت‌های Shadcn + data-state
    └── pages/
        ├── overview-page.tsx
        ├── payment-health-page.tsx
        ├── retry-analysis-page.tsx
        ├── insights-page.tsx       # فهرست بینشها
        ├── insight-detail-page.tsx # جزئیات بینش
        ├── trace-page.tsx          # ردیابی محاسبه
        ├── advisor-page.tsx        # مشاور پرداخت (تحلیل + LLM)
        └── design-page.tsx         # نمایشگاه سیستم طراحی
```

ضمناً `frontend/README.md` برای تحویل نهایی ساخته شده است (بخش ۳).

## 5. قرارداد طراحی و کیفیت

- کامپوننت‌ها نام انگلیسی، محدود و تک‌مسئولیت‌اند؛ متن نمایشی فارسی است.
- توکن‌های رنگ و فونت فقط در `src/style.css`؛ رنگ خام در صفحات پراکنده نمی‌شود.
- Button حداقل 44px ارتفاع (`min-h-11` در buttonVariants)؛ دکمه icon-only دارای `aria-label`.
- ناوبری با keyboard قابل دسترسی است (لینک‌های واقعی + `aria-current`).
- وضعیت‌های loading، empty و error جدا نمایش داده می‌شوند (الزام شفافیت).
- RTL در کل چیدمان رعایت شده (sidebar راست، آیکون‌ها در سمت درست).
- الگوهای CLEAN_CODE_GUIDELINES در فرانت دنبال می‌شود: ماژول‌های تک‌قابلیت، منبع حقیقت واحد برای مسیرها، بدون abstraction بی‌مورد، نام‌های گویا.

## 6. محدودیت‌ها و نکات مهم

- فرانت به **Backend واقعی (Django)** متصل است؛ همه داده‌ها واقعی (از دیتاست ۲.۲ میلیون تلاش) هستند.
- احراز هویت **JWT** (Bearer) است؛ `demo-session` برای محیط توسعه، `login/refresh` برای تولید. رفرش خودکار توکن در adapter.
- **LLM Advisor** از سرویس آوالای (AvalAI) استفاده می‌کند (`LLM_API_*` در `.env` backend). بدون کلید، fallback قطعی (deterministic) فعال می‌شود.
- برای کارکرد LLM باید `LLM_API_URL=https://api.avalai.ir/v1/chat/completions` باشد (آدرس کامل endpoint، نه فقط پایه).
- VPN: برای اتصال به آوالای در ایران، معمولاً VPN باید خاموش باشد.
- **فایل‌های باقی‌مانده starter قدیمی Vite (`src/main.ts`، `src/counter.ts`، `src/assets/`) هنوز بلااستفاده‌اند و حذف نشده‌اند؛ cleanup مستقل لازم است.**
- لوگوی واقعی زرین‌پال اضافه نشده؛ برند فعلی Mark نمایشی است.
- `main.tsx` با BrowserRouter است؛ اگر هاست استاتیک باشد مسیرها نیاز به rewrites دارند (فعلاً dev و local کافی است).
- تم فعلی dark-only است.
- Build تولید با `npm run build` موفق تأیید شده است.

## 7. تحویل و گام‌های بعدی

همه ۱۱ تسک فرانت‌اند + قابلیت LLM (پس از اتصال backend) انجام شده است. تحویل شامل:
- `frontend/README.md` برای داور/توسعه‌دهنده بعدی.
- این سند (`FRONTEND_HANDOFF.md`) به‌عنوان منبع حقیقت وضعیت.
- `npm run build` موفق به‌عنوان اثبات صحت.

### قابلیت‌های LLM (جدید، بعد از Task 11)

- **صفحه «مشاور پرداخت» (`/advisor`)**: سؤال بپرسید؛ پاسخ شامل خلاصه اجرایی، توصیه‌های اولویت‌دار و روایت LLM (با یافته‌ها، اقدام‌ها و نکات احتیاطی) است. `narrative_source` مشخص می‌کند پاسخ از LLM آمده یا fallback قطعی.
- **تکمیل اقدام‌های بینش با LLM**: در جزئیات هر بینش، دکمه «دریافت نظر LLM» شواهد بینش (معیار، عوامل، اثر مالی) را به سؤال LLM تبدیل می‌کند و ۳ اقدام عملیاتی مختص پذیرنده پیشنهاد می‌دهد (هر اقدام با دلیل و ریسک). پاسخ defensive است (اگر LLM آرایه object بدهد، فیلد متنی استخراج می‌شود).

کارهای باقی‌مانده (خارج از scope فعلی):
- پاکسازی فایل‌های قدیمی starter و commit های تمیزتر (اختیاری).
- اضافه‌کردن لوگوی واقعی زرین‌پال.
- زمان‌بندی خودکار تولید بینش (cron در backend) به‌جای refresh دستی.

## 8. مستندات مرجع

- `BACKEND_IMPLEMENTATION_SPEC.md`: قراردادهای آینده API، insight و trace (مرجع Task 4 تا 9).
- `CLEAN_CODE_GUIDELINES.md`: قواعد کیفیت کد (نام‌گذاری، لایه‌بندی، type safety).
- این سند: وضعیت واقعی فرانت‌اند تا این لحظه.
