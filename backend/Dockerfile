# ---- Network API ------------------------------------------------------------
# Production image: Gunicorn + WhiteNoise. Listens on $PORT (Railway/Heroku
# convention, defaults to 8000). Migrations run on start unless
# MIGRATE_ON_START=0 (use the platform's pre-deploy hook instead).

FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_DEBUG=0 \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Collect static assets at build time (admin, DRF, Swagger UI). The key is a
# build-only placeholder: collectstatic never touches the database.
RUN DJANGO_SECRET_KEY=build-only-placeholder-not-used-at-runtime-0123456789 \
    python manage.py collectstatic --noinput

RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/media \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health/" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application"]
