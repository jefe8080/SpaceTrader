# Build-Stage: Abhängigkeiten inkl. better-sqlite3 (natives Modul) installieren
FROM node:24.13.0-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Runtime-Stage
FROM node:24.13.0-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/app/data/world-v5/spacetrader.db
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY shared ./shared
COPY server ./server
COPY client ./client
COPY scripts ./scripts
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
# exec-Form, damit SIGTERM direkt bei Node ankommt und der Spielstand gespeichert wird
CMD ["node", "server/index.js"]
