# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Email the maintainer (see the GitHub profile of [@JonasJavier](https://github.com/JonasJavier)) with a description of the issue and steps to reproduce. You will get an acknowledgement within a few days.

## What is in place

- **Authentication**: JWT access tokens (30 min) + rotating refresh tokens (7 days) with blacklist on logout, password change and account deletion.
- **Brute-force protection**: login, registration and password-change endpoints are rate-limited per client address (`THROTTLE_AUTH`, default 10/min); the whole API is throttled per user/anonymous client.
- **Passwords**: Django's validators (length, common passwords, similarity, numeric) on registration and change.
- **Uploads**: size limit (5 MB), Pillow decode check, decompression-bomb guard, EXIF stripping and re-encoding to WebP.
- **Transport**: with `DJANGO_DEBUG=0` the API enforces HTTPS redirects, HSTS (1 year, preload), secure cookies, `nosniff`, `X-Frame-Options: DENY` and a strict referrer policy. The frontend's nginx sends a Content-Security-Policy and the same hardening headers.
- **Secrets**: never in the repository; the API refuses to start in production with the development `SECRET_KEY`.
- **CORS**: explicit allow-list of frontend origins.

## Supported versions

Only the `main` branch receives fixes.
