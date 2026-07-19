# Multi-stage build for the Next.js web app (apps/web). Build context is the monorepo
# root (`docker build -f apps/web/Dockerfile .`), matching apps/api/Dockerfile.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web

# NEXT_PUBLIC_* variables are inlined into the client bundle at build time, not read at
# container runtime, so the API origin must be supplied as a build arg.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build:web
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/next.config.* ./apps/web/

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["npm", "run", "start"]
