# داشبورد تحلیل پرداخت زرین‌پال

این پروژه از دو بخش تشکیل شده است:

- **Backend:** Django + Django Ninja، PostgreSQL و DuckDB
- **Frontend:** React + TypeScript + Vite (در Docker با nginx سرو می‌شود)

کل استک (PostgreSQL، Backend و Frontend) با یک دستور Docker اجرا می‌شود؛ Node.js روی سیستم لازم نیست.

## پیش‌نیازها

قبل از شروع این ابزارها را نصب و اجرا کنید:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)؛ Docker باید در حال اجرا باشد.
- Git

برای بررسی نصب بودن Docker در PowerShell اجرا کنید:

```powershell
docker --version
docker compose version
```

Node.js فقط برای توسعه فرانت با hot-reload لازم است (بخش «توسعه فرانت» در پایین).

## راه‌اندازی سریع

تمام دستورهای این بخش از **ریشه پروژه** اجرا می‌شوند؛ یعنی همان پوشه‌ای که فایل `docker-compose.yml` داخل آن است.

### 1. تنظیم متغیرهای محیطی و کلید API

فایل `.env` پروژه از قبل شامل تنظیمات محلی و کلید API است. این فایل را حذف یا commit نکنید و مقدار کلید را داخل README یا کد Frontend قرار ندهید.

اگر فایل `.env` وجود نداشت، آن را از روی نمونه بسازید:

```powershell
Copy-Item .env.example .env
```

سپس این سه مقدار را در `.env` تنظیم کنید:

```env
LLM_API_URL=https://api.avalai.ir/v1/chat/completions
LLM_API_KEY=YOUR_API_KEY
LLM_MODEL=gpt-5.6-sol
```

کلید فقط توسط Backend خوانده می‌شود. پس از تغییر `.env` باید کانتینر Backend را دوباره بسازید:

```powershell
docker compose up --build -d
```

### 2. اجرای کل استک با Docker

```powershell
docker compose up --build -d
```

این دستور سه سرویس را بالا می‌آورد: PostgreSQL، Backend (مایگریشن‌ها به‌صورت خودکار هنگام استارت اجرا می‌شوند) و Frontend که با nginx سرو می‌شود.

برای بررسی سلامت Backend:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

در اجرای اول و قبل از ورود داده، مقدار `analytic_store` ممکن است `not_ready` باشد؛ این حالت طبیعی است.

### 3. ورود دیتاست و تولید بینش‌ها (فقط بار اول)

فایل `other_challenge_data.csv.gz` باید در مسیر `backend/data/raw/` موجود باشد (این مسیر داخل کانتینر به `/app/data/raw` نگاشت می‌شود). برای ساخت دیتابیس تحلیلی اجرا کنید:

```powershell
docker compose exec backend uv run python manage.py ingest_analytics data/raw/other_challenge_data.csv.gz
```

این مرحله به‌دلیل حجم دیتاست ممکن است چند دقیقه زمان ببرد. سپس بینش‌های دمو را تولید کنید؛ این دستور تغییرات معنادار ماه‌به‌ماه نرخ موفقیت همه پذیرنده‌ها را اسکن می‌کند و برای ۲۰ مورد برتر بینش می‌سازد:

```powershell
docker compose exec backend uv run python manage.py generate_all_insights
```

پس از پایان، دوباره سلامت سرویس را بررسی کنید:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

خروجی آماده باید شامل `status: ok` و `analytic_store: up` باشد.

### 4. مشاهده داشبورد

حالا این آدرس‌ها در دسترس‌اند:

- داشبورد (سرو‌شده با nginx): <http://localhost:5173>
- مستندات تعاملی API: <http://localhost:8000/api/v1/docs>
- Health Check: <http://localhost:8000/api/v1/health>

فرانت داخل Docker، درخواست‌های `/api` را از طریق nginx به Backend می‌فرستد؛ بنابراین نیازی به قرار دادن کلید API یا آدرس Backend در Frontend نیست.

## توسعه فرانت با hot-reload (اختیاری)

برای تغییر روزمره فرانت، اجرای Vite با hot-reload سریع‌تر از build تولیدی Docker است. ابتدا کانتینر frontend را متوقف کنید تا تداخل پورت پیش نیاید:

```powershell
docker compose stop frontend
cd frontend
npm install
npm run dev
```

Vite در حالت توسعه درخواست‌های `/api` را خودکار به Backend روی پورت `8000` هدایت می‌کند.

## احراز هویت در محیط توسعه

Frontend هنگام باز شدن به‌صورت خودکار از مسیر `demo-session` وارد می‌شود. Backend یک کاربر محلی به نام `demo-dashboard` می‌سازد و دسترسی پذیرنده‌های ingestشده را به او می‌دهد. برای اجرای محلی نیازی به ساخت کاربر یا ورود دستی نیست.

این قابلیت فقط برای محیط توسعه است و نباید با تنظیمات development در production اجرا شود.

## استفاده از قابلیت مشاور هوشمند

پس از بالا آمدن هر دو بخش، از منوی داشبورد وارد صفحه مشاور شوید. درخواست از Frontend به Backend می‌رود و Backend با مقادیر `LLM_API_URL`، `LLM_API_KEY` و `LLM_MODEL` سرویس مدل را صدا می‌زند.

اگر سرویس مدل در دسترس نباشد یا کلید اشتباه باشد، Backend گزارش قطعی مبتنی بر داده را برمی‌گرداند، اما روایت تکمیلی مدل تولید نمی‌شود. برای دیدن خطای سرویس، لاگ Backend را بررسی کنید:

```powershell
docker compose logs -f backend
```

## دستورات روزمره

مشاهده وضعیت کانتینرها:

```powershell
docker compose ps
```

مشاهده لاگ Backend:

```powershell
docker compose logs -f backend
```

راه‌اندازی مجدد Backend پس از تغییر کد یا تنظیمات:

```powershell
docker compose up --build -d backend
```

راه‌اندازی مجدد Frontend پس از تغییر کد فرانت:

```powershell
docker compose up --build -d frontend
```

خاموش کردن سرویس‌ها بدون حذف داده PostgreSQL:

```powershell
docker compose down
```

ساخت نسخه production فرانت (بدون Docker، برای بررسی تایپ):

```powershell
cd frontend
npm install
npm run build
```

## اجرای تست‌ها

تست‌های Backend:

```powershell
docker compose exec backend uv run pytest
```

بررسی build و TypeScript فرانت:

```powershell
cd frontend
npm run build
```

## رفع خطاهای رایج

### Docker اجرا نمی‌شود

Docker Desktop را باز کنید و بعد از آماده شدن آن، `docker compose up --build -d` را دوباره اجرا کنید.

### خطای mount هنگام استارت Backend (not a directory)

دیتاست باید دقیقاً در مسیر `backend/data/raw/other_challenge_data.csv.gz` باشد؛ نه یک پوشه هم‌نام در همان مسیر، و بدون mount تک‌فایل اضافه در `docker-compose.yml` (mount تک‌فایل روی درایو ویندوز قابل‌اعتماد نیست). در صورت مشکل، پوشه‌های `backend/data/raw|processed|warehouse` باید روی دیسک وجود داشته باشند.

### پورت 8000 یا 5173 اشغال است

برنامه‌ای که از پورت استفاده می‌کند را ببندید. وضعیت سرویس‌های Docker را با `docker compose ps` بررسی کنید.

### Health Check مقدار `analytic_store: not_ready` دارد

دستور ingestion را اجرا کنید و مطمئن شوید فایل `backend/data/raw/other_challenge_data.csv.gz` وجود دارد.

### بینش‌ها در داشبورد نمایش داده نمی‌شوند

بینش‌ها خودکار ساخته نمی‌شوند؛ دستور `generate_all_insights` را اجرا کنید. ضمناً بینش هر پذیرنده فقط وقتی نمایش داده می‌شود که همان پذیرنده در انتخابگر بالای داشبورد انتخاب شده باشد.

### Frontend خطای اتصال یا Login نشان می‌دهد

ابتدا این آدرس را باز کنید: <http://localhost:8000/api/v1/health>. سپس لاگ را ببینید:

```powershell
docker compose logs --tail 100 backend
```

اگر از Vite dev server استفاده می‌کنید، proxy فقط در حالت dev فعال است.

### تغییر `.env` اعمال نشده است

کانتینر Backend را recreate کنید:

```powershell
docker compose up --build -d --force-recreate backend
```

### داده‌ای در داشبورد نمایش داده نمی‌شود

ابتدا ingestion را اجرا کنید. سپس صفحه را refresh کنید تا `demo-session` دوباره ساخته و دسترسی پذیرنده‌ها همگام شود.

## ساختار کوتاه پروژه

```text
.
├── backend/                     # Django API و موتور تحلیل
│   └── data/raw/                # محل دیتاست ورودی (other_challenge_data.csv.gz)
├── frontend/                    # React/Vite dashboard + Dockerfile/nginx
├── .env                         # تنظیمات و کلیدها؛ commit نشود
├── .env.example                 # نمونه تنظیمات بدون اطلاعات محرمانه
└── docker-compose.yml           # PostgreSQL، Backend و Frontend
```

برای جزئیات معیارها و تصمیم‌های فنی به `backend/docs/METRICS.md` و `backend/docs/DECISIONS.md` مراجعه کنید.
