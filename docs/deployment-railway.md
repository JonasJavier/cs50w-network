# Deploying to Railway

> **Reference deployment:** https://web-production-9475c.up.railway.app (web) · https://api-production-53d41.up.railway.app (API) — the setup described below, running on the Railway project `network`.

Network runs as **two services from this monorepo** plus a PostgreSQL database (Redis optional):

| Service | Root directory | Builder | Port | Health check |
| --- | --- | --- | --- | --- |
| `api` | `backend/` | Dockerfile (`backend/Dockerfile`) | `$PORT` (Railway sets it) | `/health/` |
| `web` | `frontend/` | Dockerfile (`frontend/Dockerfile`) | `$PORT` | `/healthz` |
| `Postgres` | — | Railway plugin | — | — |
| `Redis` (optional) | — | Railway plugin | — | — |

Both `backend/railway.json` and `frontend/railway.json` pin the builder, health-check path and restart policy, so a service only needs its **root directory** and its variables.

## 1. Create the project and services

Using the Railway CLI (logged in, or with `RAILWAY_API_TOKEN` exported):

```bash
railway init --name network --workspace "<your workspace>"

railway add --database postgres
# optional: railway add --database redis

railway add --service api --repo <owner>/cs50w-network --branch main
railway add --service web --repo <owner>/cs50w-network --branch main
```

Then set the **root directory** of each service (`backend` and `frontend`) in *Service → Settings → Source*, or with the CLI:

```bash
railway service api  && railway environment edit --json <<< '{"services":{"api":{"source":{"rootDirectory":"backend"}}}}'
railway service web  && railway environment edit --json <<< '{"services":{"web":{"source":{"rootDirectory":"frontend"}}}}'
```

> The exact `environment edit` payload depends on the CLI version; the dashboard setting is equivalent.

## 2. Variables

### `api`

| Variable | Value |
| --- | --- |
| `DJANGO_SECRET_KEY` | long random string — `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DJANGO_DEBUG` | `0` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (only if Redis was added) |
| `CORS_ALLOWED_ORIGINS` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` |
| `MEDIA_ROOT` | `/app/media` (mount a volume there — see §3) |
| `MIGRATE_ON_START` | `0` if you use the pre-deploy command from `railway.json`; leave unset otherwise |
| `WEB_CONCURRENCY` | `2` (raise with the plan) |
| `SENTRY_DSN` | optional |

`ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` are derived automatically from `RAILWAY_PUBLIC_DOMAIN`; add `DJANGO_ALLOWED_HOSTS` only for a custom domain.

```bash
railway variable set --service api 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway variable set --service api 'CORS_ALLOWED_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}'
railway variable set --service api DJANGO_DEBUG=0 MEDIA_ROOT=/app/media
python -c "import secrets; print(secrets.token_urlsafe(64))" | railway variable set --service api DJANGO_SECRET_KEY --stdin
```

### `web`

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` — **build-time**: redeploy `web` after changing it |
| `VITE_SHOW_DEMO_ACCOUNTS` | `0` to hide the demo-account helper on the login page |

Railway passes service variables to Docker builds as build arguments when the Dockerfile declares them with `ARG`, which `frontend/Dockerfile` does.

## 3. Persistent uploads

Container disks are wiped on every deploy. Choose one:

- **Volume** — `railway volume add --service api --mount-path /app/media`. Django serves the files itself (`SERVE_MEDIA=1`, the default without S3).
- **Object storage** — set `AWS_STORAGE_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT_URL` (Railway Bucket, Cloudflare R2, AWS S3, MinIO…). The API switches to `django-storages` automatically.

## 4. Domains

```bash
railway domain --service api          # api-xxxx.up.railway.app
railway domain --service web          # web-xxxx.up.railway.app
railway domain www.example.com --service web   # custom domain → prints the DNS records
```

After generating domains, make sure `CORS_ALLOWED_ORIGINS` (api) and `VITE_API_URL` (web) reference them, then redeploy `web`.

## 5. Deploy and verify

```bash
railway deployment list --service api --limit 3 --json    # SUCCESS
railway logs --service api --deployment --lines 100
curl https://<api-domain>/health/                          # {"status":"ok",...}
curl -I https://<web-domain>/                              # 200
```

Seed demo data (optional):

```bash
railway ssh --service api -- python manage.py seed
railway ssh --service api -- python manage.py createsuperuser
```

Without SSH access (CI, restricted networks), set `SEED_ON_START=1` on the `api` service: the entrypoint runs the idempotent `seed` command after migrations on every boot. Remove the variable afterwards if you do not want the demo content recreated on each deploy.

## Alternative: Docker Compose on a VPS

`docker-compose.yml` runs the same two images with PostgreSQL and Redis. Put a TLS-terminating reverse proxy (Caddy, Traefik, nginx) in front, set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` and build `web` with `VITE_API_URL` pointing at the public API URL.

## Checklist

- [ ] `DJANGO_DEBUG=0` and a real `DJANGO_SECRET_KEY`
- [ ] `DATABASE_URL` set (PostgreSQL)
- [ ] Uploads on a volume or S3
- [ ] `CORS_ALLOWED_ORIGINS` = web origin · `VITE_API_URL` = api origin (then rebuild web)
- [ ] `/health/` returns 200
- [ ] `python manage.py check --deploy` is clean (CI runs it)
