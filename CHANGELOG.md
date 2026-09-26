# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [3.1.0] — 2026-09-26

Production-readiness release: new social features, hardened backend, redesigned frontend, documentation and deployment configuration.

### Added

- **Reposts and quotes** (`Post.repost_of`, `POST /posts/{id}/repost/`, `repost_of_id` on create) with counters, feed rendering and notifications.
- **Bookmarks** (`POST /posts/{id}/bookmark/`, `?bookmarked=1`) and a Bookmarks page.
- **Hashtags** extracted server-side, `?hashtag=` / `search=#tag` filters, `GET /hashtags/trending/` and a trending widget.
- **@mentions** with `mention` notifications; clickable links, mentions and hashtags in posts and comments.
- **Likes list** (`GET /posts/{id}/likes/`), *Likes* tab on profiles (`?liked_by=`), `?media=1` filter.
- **Account management**: login with email or username, `POST /auth/password/change/` (revokes other sessions), `DELETE /users/me/`, remove avatar/cover, `follows_you` flag, private `email`/`last_login` on `/users/me/`.
- **Comments**: edit own comments, `is_edited`, delete confirmation, notification deep-links that highlight the comment.
- **Notifications**: `repost`, `quote`, `mention` verbs, `comment_preview`, `?unread=1`, `DELETE /notifications/clear/`; notifications are removed when the like/follow/repost is undone.
- `GET /health/` probe, ReDoc at `/api/redoc/`, complete OpenAPI schema (no generator warnings).
- Server-side **image processing** (Pillow): validation, EXIF orientation + metadata stripping, resizing per kind, WebP re-encoding; orphaned files are deleted.
- Optional **S3-compatible media storage** (`django-storages`) and **Sentry** integration; Railway domain auto-configuration; structured logging.
- **Rate limiting** on credential endpoints; reserved and validated usernames; case-insensitive uniqueness for username and e-mail.
- Frontend: toasts, confirm dialogs, error boundary, lazy-loaded routes, focus-trapped modals, lightbox, PWA manifest and icons, `/` search shortcut, light/dark/system theme, Settings page, optimistic updates for every toggle, drag-and-drop/paste images, self-hosted Inter font.
- Tests: 97 backend tests (auth, profiles, follows, posts, reposts, hashtags, mentions, comments, notifications, images, health) and 34 frontend tests (Vitest + Testing Library).
- Tooling: ruff, Prettier, `Makefile`, `.editorconfig`, issue/PR templates, CI with lint + tests + `check --deploy` + Docker builds.
- Documentation: README with screenshots, `docs/architecture.md`, `docs/api.md`, `docs/development.md`, `docs/deployment-railway.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- `railway.json` for both services; Dockerfiles honour `$PORT`; nginx template with security headers and CSP.

### Changed

- The *Following* feed now includes the requester's own posts.
- Cursor pagination orders by `(-created_at, -id)`; feed counters use correlated subqueries instead of multi-join `COUNT(DISTINCT)`.
- Search results are ordered by popularity.
- `seed` generates avatars, covers and post images procedurally, creates reposts, quotes, bookmarks and notifications, and is fully idempotent.
- Frontend design system refined (animations, reduced-motion support, accessible names on every control, stable image aspect ratio).
- README license corrected to GPL-3.0 to match `LICENSE`.

### Fixed

- Registration errors are reported per field.
- Deleting a comment updates the post's comment counter including its replies.
- Duplicate follow/like notifications are no longer possible.

## [3.0.0] — 2026-06-12

- Rewrite as Django 6 + DRF API and React 19 + Vite + TypeScript SPA; JWT auth, infinite feed, comments with replies, profiles, follows, notifications, search, dark mode, Docker Compose stack.

## [1.0.0]

- Original CS50W Project 4 submission (server-rendered Django + vanilla JavaScript).
