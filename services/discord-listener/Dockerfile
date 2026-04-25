# ── Build Stage ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install || npm install || npm install
COPY tsconfig.json ./
COPY src ./src
# Cache bust: Docker sometimes caches stale tsc output
ARG CACHEBUST=1
RUN npx tsc && echo "Compiled files:" && find dist -name "*.js" | head -30

# ── Production Stage ─────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev || npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
