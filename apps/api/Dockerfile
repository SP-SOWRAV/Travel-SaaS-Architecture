# Multi-stage build for the NestJS API (apps/api). Build context is the monorepo root
# (`docker build -f apps/api/Dockerfile .`) so npm workspace linking to
# packages/shared-types resolves the same way it does in local dev.

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api

# Prisma Client's generated types are referenced throughout the source, so it must exist
# before `nest build`'s TypeScript compilation runs — `npm ci` alone doesn't generate it
# (no postinstall hook), unlike a local `prisma migrate dev`, which generates it as a
# side effect.
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build:api
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma's native query-engine binary needs OpenSSL at runtime, not just at build time —
# this is what the Alpine base image lacked (its musl libc ships no libssl.so.1.1 at all),
# confirmed by an actual container run failing with a PrismaClientInitializationError.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
