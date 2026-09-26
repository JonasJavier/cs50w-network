#!/bin/sh
# Entrypoint for the API container.
#   * runs migrations (unless MIGRATE_ON_START=0)
#   * execs the given command; gunicorn picks up PORT / WEB_CONCURRENCY
set -eu

if [ "${MIGRATE_ON_START:-1}" = "1" ]; then
  echo "==> Applying database migrations"
  python manage.py migrate --noinput
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
