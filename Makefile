# Developer shortcuts. Run `make help` to list them.
.DEFAULT_GOAL := help
PY := python

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Install backend + frontend dependencies
	cd backend && $(PY) -m pip install -r requirements-dev.txt
	cd frontend && npm ci

migrate: ## Apply database migrations
	cd backend && $(PY) manage.py migrate

seed: ## Load demo users, posts, comments, reposts and bookmarks
	cd backend && $(PY) manage.py seed

api: ## Run the Django API on :8000
	cd backend && $(PY) manage.py runserver

web: ## Run the Vite dev server on :5173
	cd frontend && npm run dev

test: test-backend test-frontend ## Run every test suite

test-backend: ## Django tests
	cd backend && $(PY) manage.py test --parallel auto

test-frontend: ## Vitest
	cd frontend && npm test

lint: ## Ruff + ESLint + Prettier + tsc
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint && npm run format:check && npm run typecheck

format: ## Auto-format both code bases
	cd backend && ruff check --fix . && ruff format .
	cd frontend && npm run format

check: lint test ## Everything CI runs

docker-up: ## Full stack with Docker Compose
	docker compose up --build

docker-seed: ## Seed demo data inside the Compose stack
	docker compose exec api python manage.py seed

.PHONY: help setup migrate seed api web test test-backend test-frontend lint format check docker-up docker-seed
