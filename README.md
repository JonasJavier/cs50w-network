# CS50W Network

A professional social network — originally built for Harvard's **CS50W (Project 4)** and rebuilt from the ground up as a modern, production-ready full-stack application.

> Academic context: the original project was completed for Harvard's *CS50's Web Programming with Python and JavaScript*. This repository documents the substantially expanded full-stack version.

| Layer    | Stack |
| -------- | ----- |
| Backend  | Django 6 · Django REST Framework · SimpleJWT · PostgreSQL · Redis |
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand |
| Infra    | Docker Compose · Gunicorn · WhiteNoise · Nginx |

## Features

- 🔐 **JWT authentication** with refresh-token rotation and blacklist on logout
- 📰 **Infinite-scroll feed** (cursor pagination) with *For you* / *Following* tabs
- ✍️ Posts with text and images, inline edit & delete
- ❤️ Likes with optimistic UI updates
- 💬 Comments with one-level threaded replies and comment likes
- 👤 Rich profiles: avatar, cover, headline, bio, location, website, media grid
- ➕ Follow/unfollow with follower/following lists and *Who to follow* suggestions (Redis-cached)
- 🔔 Notifications (follows, likes, comments, replies) with unread badge
- 🔎 Search across people and posts
- 🌙 Dark/light theme, fully responsive (bottom navigation on mobile)
- 📚 OpenAPI schema with Swagger UI at `/api/docs/`

## Project structure

```
├── backend/             # Django REST API
│   ├── config/          # Settings (env-driven), URLs, WSGI/ASGI
│   └── apps/
│       ├── core/        # Pagination, permissions, validators, seed command
│       ├── users/       # Custom User, Follow, profiles, suggestions
│       ├── posts/       # Post, PostLike, Comment (+replies)
│       └── notifications/
├── frontend/            # React SPA (Vite + TypeScript + Tailwind)
│   └── src/
│       ├── lib/         # API client (axios + JWT refresh), types, utils
│       ├── stores/      # Zustand: auth tokens, theme
│       ├── hooks/       # TanStack Query hooks
│       ├── components/  # layout / ui / posts / users
│       └── pages/
└── docker-compose.yml   # PostgreSQL + Redis + API + frontend
```

## Quick start (local development)

Requirements: Python 3.13+, Node 20+. No database setup needed — development falls back to SQLite and an in-memory cache.

**Backend**

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/activate        # Windows · on Unix: source ../.venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed            # optional demo data
python manage.py runserver
```

**Frontend** (second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. With seeded data you can log in as `ada`, `grace`, `linus`, `margaret`, `alan`, `katherine`, `tim` or `hedy` — password `network123`.

## Quick start (Docker)

```bash
docker compose up --build
docker compose exec api python manage.py seed   # optional demo data
```

- Frontend: http://localhost:8080
- API: http://localhost:8000 · Swagger UI: http://localhost:8000/api/docs/

## Configuration

All backend settings are environment-driven (see [backend/.env.example](backend/.env.example)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | dev key | Set a long random string in production |
| `DJANGO_DEBUG` | `1` | Set `0` in production (enables HSTS, secure cookies, SSL redirect) |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hosts |
| `DATABASE_URL` | SQLite file | e.g. `postgres://user:pass@host:5432/network` |
| `REDIS_URL` | — (local memory) | e.g. `redis://localhost:6379/0` |
| `CORS_ALLOWED_ORIGINS` | Vite dev server | Comma-separated frontend origins |

Frontend: set `VITE_API_URL` (see [frontend/.env.example](frontend/.env.example)).

## API overview

```
POST   /api/v1/auth/register/            create account (returns JWT pair)
POST   /api/v1/auth/token/               login
POST   /api/v1/auth/token/refresh/       rotate tokens
POST   /api/v1/auth/logout/              blacklist refresh token

GET    /api/v1/users/me/                 my profile          PATCH to edit
GET    /api/v1/users/{username}/         public profile
POST   /api/v1/users/{username}/follow/  follow              DELETE to unfollow
GET    /api/v1/users/{username}/followers|following/
GET    /api/v1/users/suggestions/        who to follow
GET    /api/v1/users/?search=…           search people

GET    /api/v1/posts/                    feed (?feed=following · ?author= · ?search=)
POST   /api/v1/posts/                    create (multipart for images)
PATCH  /api/v1/posts/{id}/               edit own           DELETE to remove
POST   /api/v1/posts/{id}/like/          toggle like
GET    /api/v1/posts/{id}/comments/      list / POST to comment (parent= for replies)
POST   /api/v1/comments/{id}/like/       toggle comment like

GET    /api/v1/notifications/            list (+ unread-count/, read-all/, {id}/read/)
```

Full interactive documentation: `/api/docs/`.

## Tests

```bash
cd backend
python manage.py test     # 32 tests: auth, posts, comments, follows, notifications
```

```bash
cd frontend
npm run lint && npm run build
```

## License

[MIT](LICENSE)
