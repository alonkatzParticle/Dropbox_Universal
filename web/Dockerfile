# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app/web
COPY package*.json ./
RUN npm ci

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app/web
COPY --from=deps /app/web/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: Production runner (lean image) ----
FROM node:20-alpine AS runner
WORKDIR /app/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the standalone server bundle (tiny — no full node_modules)
COPY --from=builder /app/web/.next/standalone/ ./
# Static assets and public folder must sit alongside server.js
COPY --from=builder /app/web/.next/static ./.next/static
# Copy public folder only if it exists (this project may not have one)
RUN if [ -d /app/web/public ]; then cp -r /app/web/public ./public; fi

# /app/ (one level up from WORKDIR) is where config.json / state.json
# are bind-mounted by docker-compose, matching the localFilePath() logic
# in lib/storage.ts: nodePath.resolve(process.cwd(), "..") → /app/
EXPOSE 3000
CMD ["node", "server.js"]
