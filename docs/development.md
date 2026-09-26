# Development guide

## Requirements

- Python **3.12+** (3.13 recommended — Django 6 needs ≥ 3.12)
- Node **20+**
- Optional: Docker / Docker Compose, PostgreSQL, Redis

## First run

```bash
# 1. Backend
cd backend
python -m venv ../.venv && source ../.venv/bin/activate   # Windows: ..\.venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed                # demo users, posts, comments, reposts, bookmarks, images
python manage.py runserver           # http://localhost:8000

# 2. Frontend (second terminal)
cd frontend
npm ci
npm run dev                          # http://localhost:5173
```

Log in with `ada`, `grace`, `linus`, `margaret`, `alan`, `katherine`, `tim` or `hedy` — password `network123`. The seed command is idempotent; run it again whenever you want the demo data back.

Without a `.env` file the API uses SQLite and an in-memory cache. Copy `backend/.env.example` to `backend/.env` to point it at PostgreSQL/Redis or to change any setting; copy `frontend/.env.example` to `frontend/.env` if the API is not on `http://localhost:8000`.

## Everyday commands

| Task | Command |
| --- | --- |
| Backend tests | `cd backend && python manage.py test --parallel auto` |
| Backend lint / format | `ruff check . && ruff format .` |
| Migrations | `python manage.py makemigrations && python manage.py migrate` |
| API docs | http://localhost:8000/api/docs/ (Swagger) · `/api/redoc/` · `/api/schema/` |
| Django admin | `python manage.py createsuperuser` → http://localhost:8000/admin/ |
| Frontend tests | `cd frontend && npm test` (`npm run test:watch`, `npm run test:coverage`) |
| Frontend lint / types / format | `npm run lint` · `npm run typecheck` · `npm run format` |
| Production build preview | `npm run build && npm run preview` |
| Everything CI runs | `make check` (from the repository root) |

## Docker Compose

```bash
docker compose up --build
docker compose exec api python manage.py seed      # optional
```

- Web: http://localhost:8080 · API: http://localhost:8000 · Swagger: http://localhost:8000/api/docs/
- PostgreSQL 17 and Redis 8 run as services; uploads persist in the `media` volume.
- `DJANGO_SECRET_KEY` and `POSTGRES_PASSWORD` can be overridden through the shell environment or a root `.env` file.

## Project conventions

See [CONTRIBUTING.md](../CONTRIBUTING.md). In short: ruff for Python, ESLint + Prettier + strict TypeScript for the frontend, tests for every endpoint and for shared frontend logic, environment-driven configuration.

## Troubleshooting

- **`ImproperlyConfigured: DJANGO_SECRET_KEY must be set`** — you started the API with `DJANGO_DEBUG=0` and no key. Generate one: `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- **CORS errors in the browser** — add the frontend origin to `CORS_ALLOWED_ORIGINS` (comma-separated, with scheme and port).
- **Images 404 in production** — either mount a persistent volume at `MEDIA_ROOT` (and keep `SERVE_MEDIA=1`) or configure the S3 variables. Container disks are ephemeral.
- **Demo data in a container** — set `SEED_ON_START=1` (or run `python manage.py seed` inside it); the command is idempotent.
- **"Too many attempts"** — the auth throttle (`THROTTLE_AUTH`, default 10/min per IP) kicked in; wait a minute or raise it locally.
