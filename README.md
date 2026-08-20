# داشبورد تحلیل پرداخت زرین‌پال

این پروژه از دو بخش تشکیل شده است:

- **Backend:** Django + Django Ninja، PostgreSQL و DuckDB
- **Frontend:** React + TypeScript + Vite

روش پیشنهادی برای توسعه محلی این است که Backend و PostgreSQL را با Docker اجرا کنید و Frontend را با Node.js بالا بیاورید.

## پیش‌نیازها

قبل از شروع این ابزارها را نصب و اجرا کنید:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)؛ Docker باید در حال اجرا باشد.
- [Node.js](https://nodejs.org/) نسخه 20 یا جدیدتر به‌همراه npm
- Git

برای بررسی نصب بودن ابزارها در PowerShell اجرا کنید:

```powershell
docker --version
docker compose version
node --version
npm --version
```

## راه‌اندازی سریع

تمام دستورهای این بخش، به‌جز دستورهای Frontend، باید از **ریشه پروژه** اجرا شوند؛ یعنی همان پوشه‌ای که فایل `docker-compose.yml` داخل آن است.

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

### 2. اجرای Backend و دیتابیس

```powershell
docker compose up --build -d
docker compose exec backend uv run python manage.py migrate
```

سرویس‌ها در پس‌زمینه اجرا می‌شوند. برای بررسی سلامت Backend:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

در اجرای اول و قبل از ورود داده، مقدار `analytic_store` ممکن است `not_ready` باشد؛ این حالت طبیعی است.

### 3. ورود دیتاست (فقط بار اول)

فایل `other_challenge_data.csv.gz` باید در ریشه پروژه موجود باشد. برای ساخت دیتابیس تحلیلی اجرا کنید:

```powershell
docker compose exec backend uv run python manage.py ingest_analytics data/raw/other_challenge_data.csv.gz
```

این مرحله به‌دلیل حجم دیتاست ممکن است چند دقیقه زمان ببرد. پس از پایان، دوباره سلامت سرویس را بررسی کنید:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

خروجی آماده باید شامل `status: ok` و `analytic_store: up` باشد.

### 4. اجرای Frontend

یک PowerShell جدید باز کنید و اجرا کنید:

```powershell
cd frontend
npm install
npm run dev
```

حالا این آدرس‌ها در دسترس‌اند:

- داشبورد: <http://localhost:5173>
- مستندات تعاملی API: <http://localhost:8000/api/v1/docs>
- Health Check: <http://localhost:8000/api/v1/health>

در حالت توسعه، Vite درخواست‌های `/api` را به Backend روی پورت `8000` هدایت می‌کند؛ بنابراین نیازی به قرار دادن کلید API یا آدرس Backend در Frontend نیست.

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

راه‌اندازی مجدد Backend پس از تغییر تنظیمات:

```powershell
docker compose up --build -d backend
```

خاموش کردن سرویس‌ها بدون حذف داده PostgreSQL:

```powershell
docker compose down
```

اجرای مجدد Frontend:

```powershell
cd frontend
npm run dev
```

ساخت نسخه production فرانت:

```powershell
cd frontend
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

### پورت 8000 یا 5173 اشغال است

برنامه‌ای که از پورت استفاده می‌کند را ببندید. وضعیت سرویس‌های Docker را با `docker compose ps` بررسی کنید.

### Health Check مقدار `analytic_store: not_ready` دارد

دستور ingestion را اجرا کنید و مطمئن شوید فایل `other_challenge_data.csv.gz` در ریشه پروژه وجود دارد.

### Frontend خطای اتصال یا Login نشان می‌دهد

ابتدا این آدرس را باز کنید: <http://localhost:8000/api/v1/health>. سپس لاگ را ببینید:

```powershell
docker compose logs --tail 100 backend
```

مطمئن شوید Frontend را با `npm run dev` اجرا کرده‌اید؛ proxy فقط در dev server فعال است.

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
├── frontend/                    # React/Vite dashboard
├── other_challenge_data.csv.gz # دیتاست ورودی محلی
├── .env                         # تنظیمات و کلیدها؛ commit نشود
├── .env.example                 # نمونه تنظیمات بدون اطلاعات محرمانه
└── docker-compose.yml           # PostgreSQL و Backend
```

برای جزئیات معیارها و تصمیم‌های فنی به `backend/docs/METRICS.md` و `backend/docs/DECISIONS.md` مراجعه کنید.
