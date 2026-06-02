"""
Doveland School Traffic Control System — Django Settings
Production-ready for Render deployment.
Falls back to dev defaults when env vars are missing.
"""
import os
from pathlib import Path
from datetime import timedelta

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Core ──────────────────────────────────────────────────
SECRET_KEY    = os.getenv("SECRET_KEY", "unsafe-dev-key-change-me")
DEBUG         = os.getenv("DEBUG", "True") == "True"

# ALLOWED_HOSTS: comma-separated. A leading "." matches any subdomain
# (e.g. ".onrender.com" matches doveland-backend.onrender.com).
ALLOWED_HOSTS = [h.strip() for h in os.getenv(
    "ALLOWED_HOSTS", "localhost,127.0.0.1"
).split(",") if h.strip()]

# Render-specific: trust the external hostname Render injects.
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# ── Apps ──────────────────────────────────────────────────
INSTALLED_APPS = [
    "daphne",                       # must come before django.contrib.staticfiles when using Channels
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "channels",
    # Local
    "apps.accounts.apps.AccountsConfig",
    "apps.students",
    "apps.pickups",
    "apps.location",
    "apps.ai_engine",
    "apps.alerts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF      = "config.urls"
ASGI_APPLICATION  = "config.asgi.application"
WSGI_APPLICATION  = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# ── Database (PostgreSQL) ─────────────────────────────────
# In production Render injects DATABASE_URL. Locally we fall
# back to the individual DB_* vars from your .env.
if os.getenv("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            conn_max_age=600,
            ssl_require=not DEBUG,   # Render Postgres requires SSL
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE":   "django.db.backends.postgresql",
            "NAME":     os.getenv("DB_NAME",     "doveland_db"),
            "USER":     os.getenv("DB_USER",     "doveland_user"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST":     os.getenv("DB_HOST",     "localhost"),
            "PORT":     os.getenv("DB_PORT",     "5432"),
        }
    }

# ── Redis & Channels ──────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG":  {"hosts": [REDIS_URL]},
    }
}
CACHES = {
    "default": {
        "BACKEND":  "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# ── Celery ────────────────────────────────────────────────
CELERY_BROKER_URL        = REDIS_URL
CELERY_RESULT_BACKEND    = REDIS_URL
CELERY_ACCEPT_CONTENT    = ["json"]
CELERY_TASK_SERIALIZER   = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE          = "Africa/Lagos"   # changed from Europe/London for your region

# ── Auth ──────────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# ── DRF ───────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# ── JWT ───────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS":  True,
    "AUTH_HEADER_TYPES":      ("Bearer",),
}

# ── CORS / CSRF ───────────────────────────────────────────
# Supports multiple frontend origins separated by commas
_frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS_ALLOWED_ORIGINS = [u.strip() for u in _frontend_urls.split(",") if u.strip()]
CORS_ALLOW_CREDENTIALS = True

# CSRF needs the *exact* origins. Required for admin login over HTTPS.
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")

# ── Production security (only when DEBUG=False) ──────────
if not DEBUG:
    # Render terminates TLS at the proxy and forwards via this header.
    SECURE_PROXY_SSL_HEADER  = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT      = True
    SESSION_COOKIE_SECURE    = True
    CSRF_COOKIE_SECURE       = True
    SECURE_HSTS_SECONDS      = 31536000      # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD      = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY   = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS          = "DENY"

# ── i18n ──────────────────────────────────────────────────
LANGUAGE_CODE = "en-gb"
TIME_ZONE     = "Africa/Lagos"      # changed from Europe/London — your local timezone
USE_I18N      = True
USE_TZ        = True

# ── Static & Media ────────────────────────────────────────
STATIC_URL    = "/static/"
STATIC_ROOT   = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
MEDIA_URL     = "/media/"
MEDIA_ROOT    = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── App-specific ──────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SCHOOL_LAT        = float(os.getenv("SCHOOL_LAT", "8.97227713255338"))
SCHOOL_LNG        = float(os.getenv("SCHOOL_LNG", "7.47895342331406"))
GEOFENCE_METRES   = int(os.getenv("GEOFENCE_METRES", "300"))

# Email: console in dev; switch to SMTP in production when ready
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING"},
        "apps":   {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
