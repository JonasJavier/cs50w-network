# ---- Network web (React SPA) --------------------------------------------------
# Stage 1: build the static bundle. VITE_API_URL is baked in at build time —
# pass it as a build argument (Railway forwards service variables declared as ARG).
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_URL=http://localhost:8000
ARG VITE_SHOW_DEMO_ACCOUNTS=1
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SHOW_DEMO_ACCOUNTS=$VITE_SHOW_DEMO_ACCOUNTS

RUN npm run build

# Stage 2: serve with nginx on $PORT (defaults to 80).
FROM nginx:1.27-alpine

ENV PORT=80

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1
