"""
Django settings for the Network API.

Everything deploy-specific is driven by environment variables (see .env.example).
Defaults are tuned for local development: SQLite + local-memory cache, so the
project runs out of the box. Point DATABASE_URL / REDIS_URL at PostgreSQL and
Redis for staging/production and set DJANGO_DEBUG=0.

Railway: RAILWAY_PUBLIC_DOMAIN and RAILWAY_PRIVATE_DOMAIN are picked up
automatically so ALLOWED_HOSTS / CSRF_TRUSTED_ORIGINS need no manual entry.
"""

import os
import sys
import tempfile
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

APP_VERSION = "3.1.0"


def env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, "1" if default else "0").lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def env_list(name: str, default: str = "") -> list[str]:
    """Parse a comma- or space-separated list from the environment."""
    raw = os.getenv(name, default).replace(",", " ")
    return [item for item in raw.split() if item]


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

_DEV_SECRET_KEY = "dev-only-insecure-secret-key-never-use-in-production"

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", _DEV_SECRET_KEY)
DEBUG = env_bool("DJANGO_DEBUG", True)

if not DEBUG and (SECRET_KEY == _DEV_SECRET_KEY or len(SECRET_KEY) < 32):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set to a long random string when DJANGO_DEBUG=0. "
        'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
    )

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

# Railway injects these for every service; use them so a fresh deploy just works.
for _railway_domain in (os.getenv("RAILWAY_PUBLIC_DOMAIN"), os.getenv("RAILWAY_PRIVATE_DOMAIN")):
    if _railway_domain and _railway_domain not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_railway_domain)
if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    CSRF_TRUSTED_ORIGINS.append(f"https://{os.environ['RAILWAY_PUBLIC_DOMAIN']}")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Local
    "apps.core",
    "apps.users",
    "apps.posts",
    "apps.notifications",
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

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Database — PostgreSQL via DATABASE_URL, SQLite fallback for local dev
# ---------------------------------------------------------------------------

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=env_int("DB_CONN_MAX_AGE", 600),
        conn_health_checks=True,
        ssl_require=env_bool("DB_SSL_REQUIRE", False),
    )
}

# ---------------------------------------------------------------------------
# Cache — Redis via REDIS_URL, local memory fallback for local dev
# ---------------------------------------------------------------------------

REDIS_URL = os.getenv("REDIS_URL", "")

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                # Never take the API down because the cache is unreachable.
                "IGNORE_EXCEPTIONS": True,
                "SOCKET_CONNECT_TIMEOUT": 3,
                "SOCKET_TIMEOUT": 3,
            },
        }
    }
    DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "network-local",
        }
    }

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "users.User"

AUTHENTICATION_BACKENDS = [
    "apps.users.backends.EmailOrUsernameBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# REST Framework / JWT / API schema
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "60/min"),
        "user": os.getenv("THROTTLE_USER", "600/min"),
        # Login / register / password change — brute-force protection.
        "auth": os.getenv("THROTTLE_AUTH", "10/min"),
    },
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        *(("rest_framework.renderers.BrowsableAPIRenderer",) if DEBUG else ()),
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Network API",
    "DESCRIPTION": (
        "REST API for **Network** — a professional social network. "
        "Authenticate with `POST /api/v1/auth/token/` and send the access token as "
        "`Authorization: Bearer <token>`."
    ),
    "VERSION": APP_VERSION,
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES")

# ---------------------------------------------------------------------------
# I18N
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_ROOT.mkdir(exist_ok=True)  # whitenoise warns if the directory is missing

MEDIA_URL = os.getenv("MEDIA_URL", "media/")
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "media"))

# Optional S3-compatible object storage (AWS S3, Railway Bucket, Cloudflare R2, MinIO…).
# Activated by AWS_STORAGE_BUCKET_NAME; otherwise uploads live on the local disk
# (mount a persistent volume at MEDIA_ROOT in production).
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
USE_S3_MEDIA = bool(AWS_STORAGE_BUCKET_NAME)

if USE_S3_MEDIA:
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "auto")
    AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL") or None
    AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN") or None
    AWS_QUERYSTRING_AUTH = env_bool("AWS_QUERYSTRING_AUTH", False)
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=31536000, public"}
    _default_storage = {"BACKEND": "storages.backends.s3.S3Storage"}
else:
    _default_storage = {"BACKEND": "django.core.files.storage.FileSystemStorage"}

# Serve MEDIA_ROOT through Django when there is no object storage / CDN in front.
SERVE_MEDIA = env_bool("SERVE_MEDIA", not USE_S3_MEDIA)

STORAGES = {
    "default": _default_storage,
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
            if not DEBUG
            else "django.contrib.staticfiles.storage.StaticFilesStorage"
        )
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Uploads: accepted size for post images / avatars (bytes) and output dimensions.
MAX_UPLOAD_SIZE = env_int("MAX_UPLOAD_SIZE", 5 * 1024 * 1024)
IMAGE_MAX_DIMENSIONS = {
    "post": (1600, 1600),
    "avatar": (512, 512),
    "cover": (1600, 600),
}
IMAGE_QUALITY = env_int("IMAGE_QUALITY", 85)
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE + 1024 * 1024

# ---------------------------------------------------------------------------
# Logging — plain text to stdout so the platform (Docker, Railway) collects it
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": os.getenv("LOG_LEVEL", "INFO")},
    "loggers": {
        "django.request": {"level": "WARNING", "propagate": True},
        "django.security": {"level": "WARNING", "propagate": True},
    },
}

if len(sys.argv) > 1 and sys.argv[1] == "test":
    # Expected 4xx responses in the test-suite would otherwise flood the output,
    # and the brute-force limiter would trip across the many login/register tests.
    LOGGING["loggers"]["django.request"]["level"] = "ERROR"
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth"] = "10000/min"
    # Uploaded test fixtures go to a throw-away directory, never to MEDIA_ROOT.
    MEDIA_ROOT = Path(tempfile.mkdtemp(prefix="network-test-media-"))

# ---------------------------------------------------------------------------
# Production hardening (active when DEBUG=0)
# ---------------------------------------------------------------------------

if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = env_int("DJANGO_HSTS_SECONDS", 60 * 60 * 24 * 365)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS = "DENY"
    USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", True)

# ---------------------------------------------------------------------------
# Error monitoring (optional) — set SENTRY_DSN to enable
# ---------------------------------------------------------------------------

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("SENTRY_ENVIRONMENT", "production" if not DEBUG else "development"),
        release=f"network@{APP_VERSION}",
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        send_default_pii=False,
    )
