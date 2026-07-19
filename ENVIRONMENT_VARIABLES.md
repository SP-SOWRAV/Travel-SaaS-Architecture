# Environment Variables

Every variable the application reads, in one place. Copy the relevant `.env.example`
(`apps/api/.env.example` → `apps/api/.env`, `apps/web/.env.example` → `apps/web/.env.local`)
and fill in real values before running anything.

## API (`apps/api`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string, e.g. `postgresql://user:password@host:5432/dbname`. Must start with `postgresql://`. |
| `JWT_SECRET` | **Yes** | — | Secret used to sign and verify auth tokens. Must be at least 32 characters. Generate one with `openssl rand -hex 32`. Rotating this invalidates every existing session. |
| `JWT_EXPIRES_IN` | No | `1h` | Access token lifetime (e.g. `1h`, `30m`, `7d`). |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated list of allowed frontend origins. Never set to `*` — the API rejects requests from any origin not in this list. Set to the real deployed web app's origin(s) in production. |
| `PORT` | No | `3001` | Port the API listens on. |

The API validates all of this at boot (`src/core/config/env.validation.ts`) and **refuses to
start** if `DATABASE_URL` is missing/malformed or `JWT_SECRET` is missing/too short — a
misconfigured environment fails immediately and loudly instead of crashing later on first
use. This is confirmed behavior (see the smoke test log in `RELEASE_NOTES.md`).

## Web (`apps/web`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Origin of the API the browser calls directly. **Build-time only** — Next.js inlines `NEXT_PUBLIC_*` variables into the client JavaScript bundle at build time, so changing this after the image is built has no effect; you must rebuild. When building the Docker image, pass it as a build argument (`--build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com`), not as a runtime `-e` flag. |

## Postgres (`docker-compose.yml`, local dev only)

These only apply to the bundled `docker-compose.yml`, which runs Postgres for local
development. A production deployment normally points `DATABASE_URL` at a managed
database instead and doesn't need these.

| Variable | Default | Description |
|---|---|---|
| `DB_USER` | `ota_user` | Postgres user created on first container start. |
| `DB_PASSWORD` | `ota_password` | Postgres password. **Change this if the port is ever exposed beyond localhost.** |
| `DB_NAME` | `ota_saas_dev` | Database name created on first container start. |
| `DB_PORT` | `5432` | Host port Postgres is published on. |

## Notes

- `.env` files are git-ignored (`.env`, `.env.local`, `.env.*.local`) — only the
  `.env.example` templates are committed. Never commit a real `JWT_SECRET` or database
  password.
- There is no separate "staging" vs "production" variable — the same variables apply to
  every environment; only the values change.
