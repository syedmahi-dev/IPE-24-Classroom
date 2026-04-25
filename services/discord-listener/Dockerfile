# ── Build Stage ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Retry npm install up to 3 times for flaky networks
RUN npm install || npm install || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ── Production Stage ─────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev || npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
