# Installation Guide

How to get the project running locally for development. For deploying to production,
see `DEPLOYMENT_GUIDE.md` instead.

## Prerequisites

- Node.js ≥ 20 ([package.json](package.json) `engines.node`)
- npm (ships with Node)
- Docker, for running Postgres locally (or your own Postgres 16 instance)

## 1. Clone and install

```bash
git clone https://github.com/SP-SOWRAV/Travel-SaaS-Architecture.git
cd Travel-SaaS-Architecture
npm install
```

This is an npm-workspaces monorepo (`apps/api`, `apps/web`, `packages/shared-types`) —
one `npm install` at the root installs everything for all three.

## 2. Start Postgres

```bash
docker compose up -d
```

Starts a Postgres 16 container on `localhost:5432` with the database
`ota_saas_dev` (see `docker-compose.yml` for the defaults, overridable via
`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_PORT` in a root `.env` file).

## 3. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` — at minimum, set `JWT_SECRET` to a real random string (32+
characters: `openssl rand -hex 32`). The default `DATABASE_URL` already matches the
`docker compose` Postgres from step 2. Full reference: `ENVIRONMENT_VARIABLES.md`.

The web app needs no `.env` file for local development — it defaults to talking to the
API at `http://localhost:3001`. Only create `apps/web/.env.local` (from
`apps/web/.env.example`) if you're pointing it at an API running somewhere else.

## 4. Run database migrations and seed data

```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

The seed command populates required reference data (countries/cities) — the app won't
have usable Country/City dropdowns without it. This is idempotent, safe to re-run.

Optional: for a fully populated demo environment (two demo Agencies with branches,
users, customers, and bookings at every workflow stage) instead of an empty one:

```bash
npm run seed:full --workspace=apps/api
```

This prints the demo login password for both seeded admin accounts when it finishes.

## 5. Run the apps

In two terminals:

```bash
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:3000
```

Open `http://localhost:3000/login` and sign in (with a demo account from step 4's
`seed:full`, or a user you create directly against the API).

## 6. Run the tests

```bash
npm run test --workspace=apps/api          # unit tests
npm run test:e2e --workspace=apps/api       # critical-path E2E suite
```

The E2E suite creates and tears down its own test Agencies against whatever
`DATABASE_URL` is configured — don't point it at a database with data you care about.

## Troubleshooting

- **API refuses to start with an "Invalid environment configuration" error** — the
  message names exactly which variable is missing/invalid; see
  `ENVIRONMENT_VARIABLES.md`.
- **`prisma migrate deploy` can't connect** — confirm the `docker compose` Postgres
  container is running (`docker ps`) and `DATABASE_URL` in `apps/api/.env` matches its
  port.
- **Web app loads but API calls fail / CORS errors in the browser console** — confirm
  `apps/api/.env`'s `CORS_ORIGIN` includes the web app's origin (defaults to
  `http://localhost:3000`, which matches `npm run dev:web`'s default port).
