# API reference

Base URL: `/api/v1/` · Interactive docs: **`/api/docs/`** (Swagger UI), `/api/redoc/`, raw schema at `/api/schema/` (OpenAPI 3).

## Authentication

Send `Authorization: Bearer <access>` on every request except the ones marked *public*. Access tokens last 30 minutes; refresh tokens 7 days and rotate on every refresh (the previous one is blacklisted).

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `auth/register/` | *public* · `{username, email, password, first_name?, last_name?}` → `{user, access, refresh}` (201). Username: 3–30 chars `[A-Za-z0-9_.]`, reserved names rejected, case-insensitive uniqueness. |
| `POST` | `auth/token/` | *public* · `{username, password}` — `username` accepts the e-mail too → `{user, access, refresh}` |
| `POST` | `auth/token/refresh/` | *public* · `{refresh}` → `{access, refresh}` |
| `POST` | `auth/logout/` | `{refresh}` — blacklists the refresh token |
| `POST` | `auth/password/change/` | `{current_password, new_password}` → new `{user, access, refresh}`; every other session is revoked |

Credential endpoints are rate-limited to **10 requests / minute per IP** (`THROTTLE_AUTH`).

## Users

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `users/me/` | Own profile (includes `email`, `last_login`) |
| `PATCH` | `users/me/` | multipart or JSON: `first_name, last_name, headline, bio, location, website, avatar, cover, remove_avatar, remove_cover` |
| `DELETE` | `users/me/` | `{password}` → 204, account and all content removed |
| `GET` | `users/?search=` | People search (username, name, headline), most-followed first — page-number pagination |
| `GET` | `users/{username}/` | Public profile with `is_following`, `follows_you`, counters |
| `POST` / `DELETE` | `users/{username}/follow/` | → `{is_following, followers_count}` |
| `GET` | `users/{username}/followers/` · `following/` | Paginated user cards |
| `GET` | `users/suggestions/` | Up to 5 people to follow (cached 5 min per user) |

**User card** shape: `{id, username, name, headline, avatar, is_following, follows_you, followers_count}`.

## Posts

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `posts/` | Feed — cursor pagination (`next` URL). Filters below. |
| `POST` | `posts/` | multipart: `content` (≤ 2000), `image`, `repost_of_id` (quote) — needs text or image |
| `GET` | `posts/{id}/` | Single post |
| `PATCH` | `posts/{id}/` | Author only · `{content}` |
| `DELETE` | `posts/{id}/` | Author only · cascades to comments, likes, reposts, quotes |
| `POST` | `posts/{id}/like/` | Toggle → `{is_liked, likes_count}` |
| `GET` | `posts/{id}/likes/` | People who liked (paginated cards) |
| `POST` | `posts/{id}/repost/` | Toggle a plain repost → `{is_reposted, reposts_count}`; reposting a repost targets the original |
| `POST` | `posts/{id}/bookmark/` | Toggle → `{is_bookmarked}` |
| `GET` | `hashtags/trending/` | Top 8 tags of the last 7 days → `[{name, posts_count}]` (cached 5 min) |

### Feed filters (`GET posts/`)

| Query | Effect |
| --- | --- |
| `feed=following` | Posts by people you follow **and your own** |
| `author=<username>` | One person's posts, reposts and quotes |
| `liked_by=<username>` | Posts that person liked |
| `bookmarked=1` | Your saved posts |
| `media=1` | Only posts with an image |
| `hashtag=<tag>` | Posts tagged `#tag` |
| `search=<text>` | Case-insensitive content search; `search=#tag` behaves like `hashtag=` |

### Post shape

```json
{
  "id": 42,
  "author": { "id": 1, "username": "ada", "name": "Ada Lovelace", "headline": "…", "avatar": "https://…/avatars/ada.webp" },
  "content": "Shipped our new pipeline #engineering",
  "image": null,
  "hashtags": ["engineering"],
  "created_at": "2026-09-26T10:00:00Z",
  "updated_at": "2026-09-26T10:00:00Z",
  "is_edited": false,
  "likes_count": 6, "comments_count": 2, "reposts_count": 1,
  "is_liked": true, "is_reposted": false, "is_bookmarked": false,
  "repost_of": null,
  "is_repost": false
}
```

- A **plain repost** has `is_repost: true`, empty `content`, and the full original post under `repost_of` (same shape minus `repost_of`).
- A **quote** has its own `content`/`image` *and* `repost_of`.

## Comments

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `posts/{id}/comments/` | Top-level comments (page-number pagination); each carries its `replies` |
| `POST` | `posts/{id}/comments/` | `{content, parent?}` — one level of replies; `parent` must belong to the same post |
| `GET` | `comments/{id}/` | Single comment |
| `PATCH` | `comments/{id}/` | Author only · `{content}` |
| `DELETE` | `comments/{id}/` | Author only · replies are removed too |
| `POST` | `comments/{id}/like/` | Toggle → `{is_liked, likes_count}` |

## Notifications

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `notifications/` | Cursor-paginated, newest first · `?unread=1` |
| `GET` | `notifications/unread-count/` | `{count}` |
| `POST` | `notifications/{id}/read/` | `{ok: true}` |
| `POST` | `notifications/read-all/` | `{ok: true, updated}` |
| `DELETE` | `notifications/clear/` | `{deleted}` |

Verbs: `follow`, `like_post`, `comment`, `reply`, `like_comment`, `mention`, `repost`, `quote`. Each row: `{id, actor, verb, post, comment, post_preview, comment_preview, is_read, created_at}`. Un-liking, un-following or undoing a repost removes the corresponding notification.

## Operational

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health/` | *public* · `{status, version, checks: {database, cache}}` — 503 when the database is unreachable |
| `GET` | `/admin/` | Django admin (staff accounts) |

## Errors

DRF conventions: `400` with `{field: [messages]}` or `{detail}`, `401` unauthenticated, `403` forbidden (not the author), `404`, `429` throttled. Uploads over `MAX_UPLOAD_SIZE` (5 MB) or that are not real images return `400`.

## Pagination

- **Cursor** (posts, notifications): `{next, previous, results}` — follow `next` verbatim. `page_size` up to 50.
- **Page number** (users, comments, likers): `{count, next, previous, results}` — `?page=`, `?page_size=` up to 50.
