# --- deps: install dependencies with full lockfile fidelity -----------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- builder: production build ----------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js resolves next.config.js's rewrites() at build time and freezes the
# result into .next/routes-manifest.json — next start never re-evaluates it,
# so BACKEND_URL must be present during this build step, not just at container
# runtime (unlike a typical server-side-only env var).
ARG BACKEND_URL=http://localhost:8080
ENV BACKEND_URL=$BACKEND_URL
ARG NEXT_PUBLIC_YANDEX_MAPS_API_KEY=""
ENV NEXT_PUBLIC_YANDEX_MAPS_API_KEY=$NEXT_PUBLIC_YANDEX_MAPS_API_KEY
RUN npm run build

# --- runner: minimal production image ---------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

USER nextjs

EXPOSE 3001
ENV PORT=3001

CMD ["npx", "next", "start", "-p", "3001"]
