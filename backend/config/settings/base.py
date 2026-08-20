import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parents[2]
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-development-only")
DEBUG = False
ALLOWED_HOSTS = [
    value for value in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost").split(",") if value
]
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "apps.merchants",
    "apps.analytics",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "apps.analytics.middleware.RequestIdMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DATABASES = {
    "default": dj_database_url.config(
        default="postgresql://zarinpal:zarinpal@localhost:5432/zarinpal", conn_max_age=60
    )
}
AUTH_PASSWORD_VALIDATORS: list[dict[str, str]] = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
ANALYTICS_DATABASE_PATH = Path(
    os.getenv("ANALYTICS_DATABASE_PATH", BASE_DIR / "data/warehouse/analytics.duckdb")
)
ANALYTICS_MEMORY_LIMIT = os.getenv("ANALYTICS_MEMORY_LIMIT", "2GB")
ANALYTICS_THREADS = int(os.getenv("ANALYTICS_THREADS", "4"))
ENABLE_DEMO_AUTH = os.getenv("ENABLE_DEMO_AUTH", "false").lower() == "true"
LLM_API_URL = os.getenv("LLM_API_URL", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
JWT_ACCESS_TOKEN_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "15"))
JWT_REFRESH_TOKEN_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_DAYS", "30"))
JWT_ISSUER = os.getenv("JWT_ISSUER", "zarinpal-merchant-analytics")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "zarinpal-dashboard")
JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY", SECRET_KEY)
