.PHONY: up down logs ps build test gateway-dev health

# ── Docker Compose ───────────────────────────────────────────
up:
	docker compose up -d --build

down:
	docker compose down -v

logs:
	docker compose logs -f

ps:
	docker compose ps

build:
	docker compose build --no-cache

# ── Database ─────────────────────────────────────────────────
db-migrate:
	docker exec -i smartcity-mysql-1 mysql -u root -prootpass smartcity < database/schema.sql

db-seed:
	docker exec -i smartcity-mysql-1 mysql -u root -prootpass smartcity < database/seed.sql

db-setup: db-migrate db-seed

# ── Development ───────────────────────────────────────────────
gateway-dev:
	cd express-gateway && npm run dev

# ── Testing ───────────────────────────────────────────────────
test:
	cd express-gateway && npm test

# ── Health check ─────────────────────────────────────────────
health:
	curl -s http://localhost:3000/health | python3 -m json.tool

# ── Kubernetes ───────────────────────────────────────────────
k8s-deploy:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/ -n smartcity

k8s-status:
	kubectl get pods -n smartcity

k8s-logs:
	kubectl logs -f deployment/api-gateway -n smartcity
