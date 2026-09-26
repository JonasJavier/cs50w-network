<div align="center">

<img src="frontend/public/icons/icon-192.png" alt="Network logo" width="96" height="96" />

# Network

**A professional social network — production-ready, full-stack, open source.**

Feed with reposts & quotes · threaded comments · @mentions & #hashtags · bookmarks · notifications · profiles · search · dark mode · PWA

<br>

<a href="https://web-production-9475c.up.railway.app"><img src="https://img.shields.io/badge/%F0%9F%9A%80_LIVE_DEMO-Open_the_app-4f46e5?style=for-the-badge" alt="Open the live demo" height="40" /></a>

### 🌐 Try it now → **[web-production-9475c.up.railway.app](https://web-production-9475c.up.railway.app)**

Log in with any demo account — `ada`, `grace`, `linus`, `margaret`, `alan`, `katherine`, `tim`, `hedy` — password **`network123`**, or create your own.<br>
API: [api-production-53d41.up.railway.app/api/docs](https://api-production-53d41.up.railway.app/api/docs/) (Swagger) · [/health/](https://api-production-53d41.up.railway.app/health/)

<br>

[![CI](https://github.com/JonasJavier/cs50w-network/actions/workflows/ci.yml/badge.svg)](https://github.com/JonasJavier/cs50w-network/actions/workflows/ci.yml)
![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![Django 6](https://img.shields.io/badge/Django-6.0-092E20?logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django%20REST%20Framework-3.17-A30000)
![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

[**Live demo**](https://web-production-9475c.up.railway.app) · [Features](#features) · [Screenshots](#screenshots) · [Tech stack](#tech-stack) · [Quick start](#quick-start) · [API](#api) · [Deployment](#deployment) · [Docs](#documentation)

</div>

---

Network started as Harvard's **CS50W Project 4** and was rebuilt from scratch as a modern, decoupled application: a Django REST API and a React single-page app, each with its own tests, Docker image and CI pipeline. It is designed to be deployed as-is (Railway, Docker Compose, any container platform) and to read like a real product, not a homework assignment.

## Features

| | |
| --- | --- |
| 📰 **Feed** | *For you* and *Following* timelines with cursor-based infinite scroll, skeleton loading and optimistic updates. |
| ✍️ **Posts** | Text up to 2 000 characters with an image (drag-and-drop or paste). Edit and delete your own posts with confirmation. |
| 🔁 **Reposts & quotes** | Repost with one click or quote a post with your own comment; counters and notifications included. |
| ❤️ **Likes** | Like posts and comments, see who liked a post, browse the posts a person has liked. |
| 💬 **Comments** | Threaded replies (one level), edit/delete your own, like any comment, deep links from notifications highlight the comment. |
| 🏷️ **Hashtags & mentions** | `#topics` are extracted server-side, searchable and ranked in a *Trending this week* widget; `@mentions` link to profiles and notify the person. |
| 🔖 **Bookmarks** | Private saved-posts list. |
| 👤 **Profiles** | Avatar and cover uploads (auto-resized, EXIF-stripped WebP), headline, bio, location, website; tabs for posts, media grid and likes; follower/following lists. |
| ➕ **Follow graph** | Follow/unfollow, *Follows you* badges, *Who to follow* suggestions cached in Redis. |
| 🔔 **Notifications** | Follows, likes, comments, replies, mentions, reposts and quotes with unread badge, mark-as-read and clear. |
| 🔎 **Search** | People (name, username, headline) and posts, `#hashtag` mode, debounced as you type, `/` shortcut. |
| ⚙️ **Account** | Log in with username *or* email, change password (revokes other sessions), delete account, light/dark/system theme. |
| 📱 **Responsive PWA** | Bottom navigation on phones, installable web manifest, self-hosted font, no third-party requests. |
| 🛡️ **Production hardening** | JWT with refresh rotation & blacklist, rate limiting on credential endpoints, HSTS/CSP/security headers, health checks, structured logging, optional Sentry and S3 storage. |
| 📚 **API docs** | OpenAPI 3 schema with Swagger UI and ReDoc. |

## Screenshots

<table>
  <tr>
    <td align="center"><b>Feed</b><br><img src="docs/screenshots/feed.png" alt="Home feed" /></td>
    <td align="center"><b>Feed · dark</b><br><img src="docs/screenshots/feed-dark.png" alt="Home feed in dark mode" /></td>
  </tr>
  <tr>
    <td align="center"><b>Profile</b><br><img src="docs/screenshots/profile.png" alt="Profile page" /></td>
    <td align="center"><b>Post & comments · dark</b><br><img src="docs/screenshots/post-detail-dark.png" alt="Post detail with comments" /></td>
  </tr>
  <tr>
    <td align="center"><b>Notifications · dark</b><br><img src="docs/screenshots/notifications-dark.png" alt="Notifications" /></td>
    <td align="center"><b>Quote a post</b><br><img src="docs/screenshots/quote-dark.png" alt="Quote post modal" /></td>
  </tr>
  <tr>
    <td align="center"><b>Search</b><br><img src="docs/screenshots/search-people.png" alt="People search" /></td>
    <td align="center"><b>Hashtag results</b><br><img src="docs/screenshots/search-hashtag.png" alt="Hashtag search" /></td>
  </tr>
  <tr>
    <td align="center"><b>Settings</b><br><img src="docs/screenshots/settings.png" alt="Settings page" /></td>
    <td align="center"><b>Edit profile</b><br><img src="docs/screenshots/edit-profile.png" alt="Edit profile modal" /></td>
  </tr>
  <tr>
    <td align="center"><b>Login</b><br><img src="docs/screenshots/login.png" alt="Login page" /></td>
    <td align="center"><b>Register</b><br><img src="docs/screenshots/register.png" alt="Register page" /></td>
  </tr>
</table>

<p align="center">
  <img src="docs/screenshots/mobile-feed.png" alt="Mobile feed" width="24%" />
  <img src="docs/screenshots/mobile-feed-dark.png" alt="Mobile feed in dark mode" width="24%" />
  <img src="docs/screenshots/mobile-profile.png" alt="Mobile profile" width="24%" />
  <img src="docs/screenshots/mobile-notifications.png" alt="Mobile notifications" width="24%" />
</p>

## Tech stack

| Layer | Technology |
| --- | --- |
| **API** | Python 3.13 · Django 6 · Django REST Framework · SimpleJWT · drf-spectacular · django-filter · Pillow · WhiteNoise · Gunicorn |
| **Data** | PostgreSQL (SQLite in development) · Redis cache (optional, in-memory fallback) · local volume or S3-compatible media storage |
| **Web** | React 19 · TypeScript · Vite · Tailwind CSS 4 · TanStack Query · React Router 7 · Zustand · lucide-react · Inter (self-hosted) |
| **Quality** | Django test runner (97 tests) · Vitest + Testing Library (34 tests) · ruff · ESLint · Prettier · strict TypeScript · GitHub Actions |
| **Ops** | Docker (multi-stage) · Docker Compose · nginx · Railway config-as-code · health checks · Sentry (optional) |

```
├── backend/                 Django project (API)
│   ├── config/              settings (env-driven), urls, wsgi/asgi
│   ├── apps/core/           pagination, permissions, throttling, images, text parsing, health, seed
│   ├── apps/users/          User, Follow, auth, profiles, suggestions
│   ├── apps/posts/          Post (+repost/quote), likes, bookmarks, hashtags, comments
│   ├── apps/notifications/  Notification
│   ├── Dockerfile · docker-entrypoint.sh · railway.json
├── frontend/                React SPA
│   ├── src/lib/             api client, types, utils, rich-text tokenizer
│   ├── src/hooks/           TanStack Query hooks + cache helpers
│   ├── src/stores/          auth, theme, toasts (Zustand)
│   ├── src/components/      ui · layout · posts · users
│   ├── src/pages/           lazy-loaded routes
│   ├── Dockerfile · nginx.conf.template · railway.json
├── docs/                    architecture, API reference, development, deployment, screenshots
├── docker-compose.yml       PostgreSQL + Redis + API + web
└── .github/workflows/ci.yml
```

## Quick start

**Requirements:** Python 3.12+ (3.13 recommended) and Node 20+. No database server needed — development uses SQLite and an in-memory cache.

```bash
git clone https://github.com/JonasJavier/cs50w-network.git
cd cs50w-network

# API
cd backend
python -m venv ../.venv && source ../.venv/bin/activate     # Windows: ..\.venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed              # 8 demo users, posts, comments, reposts, bookmarks, images
python manage.py runserver         # http://localhost:8000

# Web (second terminal)
cd frontend
npm ci
npm run dev                        # http://localhost:5173
```

Open **http://localhost:5173** and log in as `ada`, `grace`, `linus`, `margaret`, `alan`, `katherine`, `tim` or `hedy` — password **`network123`**. Swagger UI lives at **http://localhost:8000/api/docs/**.

There is also a `Makefile` (`make help`) and a Docker Compose stack:

```bash
docker compose up --build                             # web :8080 · api :8000 · PostgreSQL · Redis
docker compose exec api python manage.py seed         # optional demo data
```

### Configuration

Everything is driven by environment variables with safe development defaults — see [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example). The essentials for production:

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Long random string (the API refuses to start in production with the dev key) |
| `DJANGO_DEBUG` | `0` in production → HTTPS redirect, HSTS, secure cookies, hashed static files |
| `DATABASE_URL` | `postgres://user:pass@host:5432/network` |
| `REDIS_URL` | `redis://host:6379/0` (optional) |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s) |
| `MEDIA_ROOT` / `AWS_*` | Persistent volume path, or S3-compatible bucket |
| `VITE_API_URL` | (web, build time) public URL of the API |

### Tests & quality

```bash
cd backend && python manage.py test --parallel auto && ruff check . && ruff format --check .
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
# or, from the root:
make check
```

CI runs the same steps plus `makemigrations --check`, `check --deploy` and both Docker builds on every push and pull request.

## API

Base URL `/api/v1/` — JWT bearer authentication. Full reference in [docs/api.md](docs/api.md); interactive docs at `/api/docs/`.

```
POST   auth/register/ · auth/token/ · auth/token/refresh/ · auth/logout/ · auth/password/change/
GET    users/me/                         PATCH edit profile · DELETE delete account
GET    users/{username}/                 followers/ · following/ · POST|DELETE follow/
GET    users/?search= · users/suggestions/
GET    posts/?feed=following|author=|liked_by=|bookmarked=1|media=1|hashtag=|search=
POST   posts/                            (multipart: content, image, repost_of_id for quotes)
PATCH  posts/{id}/ · DELETE posts/{id}/
POST   posts/{id}/like/ · repost/ · bookmark/          GET posts/{id}/likes/
GET    posts/{id}/comments/ · POST (parent= for replies)
PATCH  comments/{id}/ · DELETE · POST comments/{id}/like/
GET    hashtags/trending/
GET    notifications/ · unread-count/    POST {id}/read/ · read-all/   DELETE clear/
GET    /health/
```

## Deployment

**Production instance (Railway):** web **https://web-production-9475c.up.railway.app** · API **https://api-production-53d41.up.railway.app** (health check at `/health/`, Swagger at `/api/docs/`).

The repository ships two `$PORT`-aware Docker images with health checks and `railway.json` files, so a Railway project is: **Postgres + `api` (root `backend/`) + `web` (root `frontend/`)**, a volume (or S3) for uploads, and a handful of variables. The step-by-step guide, including the exact variables and CLI commands, is in **[docs/deployment-railway.md](docs/deployment-railway.md)**. Docker Compose behind any TLS-terminating proxy works the same way.

## Documentation

- [docs/architecture.md](docs/architecture.md) — how the API and the SPA are put together, data model, query strategy, optimistic updates, accessibility
- [docs/api.md](docs/api.md) — every endpoint, filter and payload
- [docs/development.md](docs/development.md) — local setup, everyday commands, troubleshooting
- [docs/deployment-railway.md](docs/deployment-railway.md) — production deployment
- [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)

## Academic origin

The original assignment — a server-rendered Django app with a JavaScript feed — was completed for Harvard's *CS50's Web Programming with Python and JavaScript* (Project 4, "Network"). Everything in this repository is a ground-up rewrite that keeps the spirit of the brief (posts, likes, follows, pagination, profiles) and expands it into a complete product.

## License

Released under the [GNU General Public License v3.0](LICENSE).
