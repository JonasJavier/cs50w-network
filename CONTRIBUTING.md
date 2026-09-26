# Contributing

Thanks for taking the time to contribute! This document explains how the project is organised and the conventions to follow.

## Getting started

```bash
git clone https://github.com/jonasjavier/cs50w-network.git
cd cs50w-network
make setup          # backend deps (into the active Python env) + frontend deps
make migrate seed   # SQLite database with demo data
make api            # http://localhost:8000  (terminal 1)
make web            # http://localhost:5173  (terminal 2)
```

Requirements: Python 3.12+ (3.13 recommended), Node 20+. See [docs/development.md](docs/development.md) for the full guide.

## Project layout

| Path | What lives there |
| --- | --- |
| `backend/config/` | Django settings (env-driven), root URLs, WSGI/ASGI |
| `backend/apps/core/` | Cross-cutting pieces: pagination, permissions, throttling, image processing, text parsing, `/health/`, the `seed` command |
| `backend/apps/users/` | Custom `User`, `Follow`, auth endpoints, profiles, suggestions |
| `backend/apps/posts/` | `Post` (+ reposts/quotes), `PostLike`, `Bookmark`, `Hashtag`, `Comment` |
| `backend/apps/notifications/` | `Notification` model and endpoints |
| `frontend/src/lib/` | API client, types, utilities, rich-text tokenizer |
| `frontend/src/hooks/` | TanStack Query hooks (one file per domain) + cache helpers |
| `frontend/src/stores/` | Zustand stores: auth tokens, theme, toasts |
| `frontend/src/components/` | `ui/` primitives, `layout/`, `posts/`, `users/` |
| `frontend/src/pages/` | Route components (lazy-loaded) |

## Conventions

**Backend**

- Formatting and linting with [ruff](https://docs.astral.sh/ruff/) (`ruff check . && ruff format .`). Line length 100.
- Every endpoint gets a test in the app's `tests.py` (or `tests/` package). Run `python manage.py test`.
- Query annotations (`likes_count`, `is_liked`, …) are computed in the view's queryset; serializers only fall back to per-object queries when the annotation is missing.
- Migrations are committed. `python manage.py makemigrations --check` runs in CI.
- Anything deploy-specific comes from an environment variable with a safe development default.

**Frontend**

- TypeScript strict mode, ESLint (`npm run lint`), Prettier (`npm run format`), Vitest (`npm test`).
- Server state lives in TanStack Query; client state in Zustand. Components never call `axios` directly — they use a hook from `src/hooks/`.
- Mutations that change something visible (like, repost, bookmark, follow) update the cache optimistically and roll back on error.
- Every interactive element needs an accessible name; every modal traps focus.

## Pull requests

1. Create a branch from `main`.
2. Keep changes focused; add or update tests.
3. Run `make check` (what CI runs) before pushing.
4. Fill in the PR template. Screenshots are welcome for UI changes.

## Commit messages

Use the conventional prefix style already used in the history: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`, `chore:`.
