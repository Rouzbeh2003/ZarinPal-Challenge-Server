# راه‌اندازی بک‌اند و فرانت‌اند

این راهنما را از ریشه پروژه اجرا کنید. بک‌اند روی آدرس
`http://localhost:8000` در دسترس خواهد بود.

## 1. اجرای بک‌اند

Docker Desktop باید در حال اجرا باشد. سپس در PowerShell:

```powershell
docker compose up --build -d
docker compose exec backend uv run python manage.py migrate
```

گزینه `-d` باعث می‌شود بک‌اند و PostgreSQL در پس‌زمینه روشن بمانند و ترمینال
برای اجرای فرانت آزاد باشد.

برای اطمینان از آماده بودن سرور:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

مستندات API:

```text
http://localhost:8000/api/v1/docs
```

## 2. اجرای فرانت‌اند

در ترمینال دیگری وارد پوشه پروژه فرانت شوید:

```powershell
cd <frontend-directory>
npm install
npm run dev
```

اگر وابستگی‌ها قبلاً نصب شده‌اند، فقط این دستور کافی است:

```powershell
npm run dev
```

در فرانت، آدرس پایه API را روی مقدار زیر قرار دهید:

```env
VITE_API_BASE_URL=/api/v1
```

برای Vite بهتر است درخواست‌ها از طریق proxy ارسال شوند تا session cookie و CSRF
به‌درستی کار کنند. نمونه تنظیم `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

برای درخواست‌های احراز هویت‌شده نیز cookie را ارسال کنید:

```ts
fetch("/api/v1/merchants", {
  credentials: "include",
});
```

## 3. دستورات کاربردی بک‌اند

مشاهده لاگ زنده بک‌اند:

```powershell
docker compose logs -f backend
```

راه‌اندازی دوباره سرویس‌ها:

```powershell
docker compose restart
```

خاموش کردن سرویس‌ها:

```powershell
docker compose down
```

## 4. آماده‌سازی داده (فقط بار اول)

اگر API داده‌ای برنمی‌گرداند و دیتاست هنوز ingest نشده است:

```powershell
docker compose exec backend uv run python manage.py ingest_analytics data/raw/other_challenge_data.csv.gz
```

APIهای داشبورد به لاگین Django و دسترسی merchant نیاز دارند. در صورت نیاز یک
کاربر ادمین بسازید:

```powershell
docker compose exec backend uv run python manage.py createsuperuser
```
