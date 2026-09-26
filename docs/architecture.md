# Architecture

Network is a classic **decoupled web application**: a JSON API built with Django REST Framework and a single-page application built with React. They are developed, tested and deployed as two independent services that share nothing but the HTTP contract documented in [`api.md`](api.md).

```
┌──────────────────────────┐        HTTPS (JSON, JWT)        ┌──────────────────────────┐
│  web  · React 19 SPA     │ ───────────────────────────────▶ │  api · Django 6 + DRF    │
│  Vite build → nginx      │ ◀─────────────────────────────── │  Gunicorn + WhiteNoise   │
└──────────────────────────┘                                  └─────────┬────────┬───────┘
                                                                        │        │
                                                          ┌─────────────▼──┐  ┌──▼───────────┐
                                                          │ PostgreSQL     │  │ Redis (cache) │
                                                          │ (SQLite in dev)│  │ (opt.)        │
                                                          └────────────────┘  └───────────────┘
                                                                        │
                                                              ┌─────────▼──────────┐
                                                              │ Media: local volume │
                                                              │ or S3-compatible    │
                                                              └─────────────────────┘
```

## Backend

### Apps

| App | Responsibility |
| --- | --- |
| `apps.core` | Shared building blocks: cursor/page pagination, `IsAuthorOrReadOnly`, the auth rate limiter, image normalisation (`images.py`), hashtag/mention parsing (`text.py`), media file cleanup signals (`files.py`), `/health/`, and the `seed` management command. |
| `apps.users` | `User` (custom `AbstractUser` with profile fields), `Follow`, registration/login/password/account endpoints, profile lookup and search, follower lists, follow suggestions (cached in Redis). |
| `apps.posts` | `Post` (plain, repost or quote via `repost_of`), `PostLike`, `Bookmark`, `Hashtag` (M2M synced from content), `Comment` (one level of replies). Feed filters, toggles (like / repost / bookmark), likers list, trending hashtags. |
| `apps.notifications` | `Notification` rows created by the other apps (follow, like, comment, reply, mention, repost, quote), unread counter, mark-as-read, clear. |

### Request flow

1. `corsheaders` → `SecurityMiddleware` → WhiteNoise (static) → Django auth/session → view.
2. Every API view authenticates with `JWTAuthentication` (SimpleJWT). Default permission is `IsAuthenticated`; the only anonymous endpoints are register, login, refresh, `/health/` and the schema/docs.
3. Two throttles run on every request (`anon` 60/min, `user` 600/min); credential endpoints add `AuthRateThrottle` keyed by client IP.
4. List views paginate: **cursor pagination** (`-created_at, -id`) for timelines so infinite scroll stays consistent while new rows are inserted, **page-number pagination** for bounded lists (people, comments).

### Query strategy

Feed rows carry everything the UI needs in one query: `likes_count`, `comments_count`, `reposts_count` are correlated `COUNT` subqueries (no join explosion), `is_liked`/`is_reposted`/`is_bookmarked` are `EXISTS` subqueries against the requester, the author is `select_related`, hashtags are `prefetch_related`, and the original of a repost/quote is prefetched with the same annotated queryset. Serializers only fall back to per-object queries when an annotation is absent (e.g. right after a create).

### Data model

```
User ──< Follow >── User
User ──< Post ──< PostLike >── User
        Post ──< Bookmark >── User
        Post >── Post (repost_of)          plain repost: unique (author, repost_of) when content = "" and no image
        Post >──< Hashtag
        Post ──< Comment ──< Comment (parent, max depth 1)
                 Comment >──< User (likes)
User ──< Notification >── User (actor)  ── Post? ── Comment?
```

### Uploads

Every image (avatar, cover, post) is validated with Pillow, EXIF-rotated, stripped of metadata, resized into a per-kind bounding box and re-encoded as WebP (animated GIFs pass through). Old files are deleted when replaced or when the row is deleted. Storage is the local filesystem (mount a volume at `MEDIA_ROOT`) or any S3-compatible bucket when `AWS_STORAGE_BUCKET_NAME` is set.

### Configuration

All settings are read from environment variables in `config/settings.py` with development-friendly defaults (SQLite, in-memory cache, `DEBUG=1`). With `DJANGO_DEBUG=0` the settings module refuses to boot with the default `SECRET_KEY`, turns on HTTPS/HSTS/secure cookies, uses the hashed static-files storage and honours `RAILWAY_PUBLIC_DOMAIN` automatically.

## Frontend

### Layers

| Layer | Directory | Notes |
| --- | --- | --- |
| Transport | `src/lib/api.ts` | One axios instance. Attaches the access token; on 401 refreshes once (single in-flight refresh promise) and replays the request; logs out when the refresh token is rejected. `apiErrorMessage`/`apiFieldErrors` normalise DRF errors. |
| Types | `src/lib/types.ts` | Mirrors the API serializers. |
| Server state | `src/hooks/*` | TanStack Query. Each domain has its own hook file; `cache.ts` holds the helpers that patch a post or a user card **everywhere it is cached** (feeds, detail, embedded originals, people lists) so optimistic updates are consistent across the screen. |
| Client state | `src/stores/*` | Zustand: persisted auth tokens + profile, theme preference (light/dark/system), toast queue. |
| UI | `src/components/ui` | Primitives: `Button`/`IconButton`, `Modal` (portal + focus trap + Esc + scroll lock), `ConfirmDialog`, `Menu`, `Tabs`, `Field`/`Input`/`PasswordInput`, `Toaster`, `Lightbox`, `EmptyState`, skeletons, `ErrorBoundary`, `RichText`. |
| Features | `src/components/posts`, `src/components/users`, `src/components/layout` | Composed from the primitives. |
| Routes | `src/pages` | Lazy-loaded with `React.lazy`; guarded by `RequireAuth`. |

### Optimistic updates

Like, repost, bookmark, comment like and follow all update the cache in `onMutate`, reconcile with the server response in `onSuccess`, and roll back in `onError` (with a toast). Creating a post, comment or repost invalidates the affected lists instead, because a new row has to come from the server.

### Styling

Tailwind CSS 4 with a small design system declared in `src/index.css`: the `brand` palette, the `card` and `input-base` utilities, keyframe animations (`fade-in`, `scale-in`, `slide-up`, `pop`) and a `dark` custom variant driven by a class on `<html>`. Inter is self-hosted (`@fontsource-variable/inter`) so the app makes no third-party requests. `prefers-reduced-motion` disables the animations.

### Accessibility

Every icon-only control has an `aria-label`; toggles expose `aria-pressed`; menus use `role="menu"`/`menuitem`; tabs use `role="tablist"`; modals are `aria-modal` with focus trapping and focus restoration; there is a skip link and live regions for toasts. Redundant avatar links are hidden from the tab order.

## Deployment topology

Two containers (see `backend/Dockerfile`, `frontend/Dockerfile`) that both honour `$PORT`:

- **api** — Gunicorn behind the platform's TLS terminator; migrations run from the entrypoint (or the platform's pre-deploy hook); `/health/` is the probe; media on a mounted volume or S3.
- **web** — nginx serving the Vite build with an SPA fallback, cache headers and security headers; `/healthz` is the probe; `VITE_API_URL` is baked in at build time.

`docker-compose.yml` reproduces the same topology locally with PostgreSQL and Redis. [`deployment-railway.md`](deployment-railway.md) walks through the production setup on Railway.
