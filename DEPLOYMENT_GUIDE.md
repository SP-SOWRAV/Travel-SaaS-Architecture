# Deployment Guide

How to deploy the OTA SaaS Platform (API + Web) to a production environment using the
Docker images already defined in this repository. This is the same path verified
before the v1.0.0 release — see `RELEASE_NOTES.md` for the verification log.

## Prerequisites

- A PostgreSQL 16 instance reachable from wherever the API container runs (managed
  database service, or self-hosted).
- Docker (or any container runtime that can build/run standard Dockerfiles) on the
  build/deploy host.
- A real `JWT_SECRET` (≥32 characters — `openssl rand -hex 32`) and the production
  database connection string. See `ENVIRONMENT_VARIABLES.md` for the full list.

## 1. Build the images

Both Dockerfiles build from the **repository root** as context (they need to see
`packages/shared-types` alongside each app for the npm workspace to resolve):

```bash
docker build -f apps/api/Dockerfile -t ota-api:v1.0.0 .

# NEXT_PUBLIC_API_URL is inlined into the browser bundle at build time — point it at
# the real, public API origin the browser will call, not a container-internal address.
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -t ota-web:v1.0.0 .
```

## 2. Run the database migrations

Run this once per deploy, before starting the API container, against the target
database:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

`migrate deploy` only applies migrations that haven't run yet — safe to re-run on every
deploy. It does not seed data or touch existing rows.

First deploy only — seed required reference data (countries/cities; this is the only
data the app needs to function, not demo data):

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

## 3. Run the containers

```bash
docker run -d --name ota-api -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="<32+ character secret>" \
  -e CORS_ORIGIN="https://app.yourdomain.com" \
  ota-api:v1.0.0

docker run -d --name ota-web -p 3000:3000 ota-web:v1.0.0
```

Put both behind a reverse proxy / load balancer that terminates TLS — neither container
does this itself.

## 4. Verify the deployment

```bash
curl https://api.yourdomain.com/api/v1/health
# {"data":{"status":"ok","database":"up"},"meta":{}}
```

A `database: "down"` (or the request timing out) means the API can't reach Postgres —
check `DATABASE_URL` and network/firewall rules between the API container and the
database. If the container exits immediately instead of starting, check its logs first —
`env.validation.ts` fails fast with a specific message on a missing/malformed
`DATABASE_URL` or `JWT_SECRET`, so the cause is usually printed directly.

Then confirm the web app loads and can reach the API: open `https://app.yourdomain.com/login`
in a browser and sign in with a real account.

## 5. Logging

Both containers log structured JSON to stdout — one line per HTTP request from the API
(`requestId`, `tenantId`, `userId`, `statusCode`, `durationMs`), captured automatically
by whatever log driver your container platform uses (CloudWatch, Docker's own
`json-file` driver, etc.). No separate logging agent needs to be installed inside the
container.

## Notes on scale-out

- The API is stateless (no in-memory session/cache) — running multiple replicas behind
  a load balancer works with no extra configuration.
- Rate limiting is currently per-instance (in-memory), not shared across replicas — with
  N replicas behind a load balancer, the effective rate limit is N× the configured
  per-instance limit. Fine for a single-instance or small-fleet deployment; revisit if
  scaling out significantly.
- The web app is a standard Next.js server (`next start`) and also scales horizontally
  with no shared state.

## CI

`.github/workflows/ci.yml` builds both apps and runs the unit test suite on every push
to `main` and every pull request. It does not build or push Docker images or deploy
anywhere — wire that into your own deployment pipeline (or extend this workflow) once a
target platform (ECS, a VM, a PaaS, etc.) is chosen.
