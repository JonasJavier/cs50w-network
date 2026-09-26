#!/bin/sh
# Entrypoint for the API container.
#   * fixes volume ownership and drops root privileges
#   * runs migrations (unless MIGRATE_ON_START=0)
#   * optionally loads the demo data set (SEED_ON_START=1; idempotent)
#   * execs the given command; gunicorn picks up PORT / WEB_CONCURRENCY
set -eu

# Platform volumes (Railway, Docker named volumes) are mounted owned by root.
# Hand the media directory to the app user, then re-exec unprivileged.
if [ "$(id -u)" = "0" ]; then
  MEDIA_DIR="${MEDIA_ROOT:-/app/media}"
  mkdir -p "$MEDIA_DIR"
  find "$MEDIA_DIR" -maxdepth 1 -exec chown appuser:appuser {} + 2>/dev/null || true
  export HOME=/home/appuser
  exec setpriv --reuid=appuser --regid=appuser --init-groups "$0" "$@"
fi

if [ "${MIGRATE_ON_START:-1}" = "1" ]; then
  echo "==> Applying database migrations"
  python manage.py migrate --noinput
fi

if [ "${SEED_ON_START:-0}" = "1" ]; then
  echo "==> Seeding demo data (SEED_ON_START=1)"
  python manage.py seed
fi

if [ "${1:-}" = "gunicorn" ]; then
  shift
  exec gunicorn \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --error-logfile - \
    "$@"
fi

exec "$@"
