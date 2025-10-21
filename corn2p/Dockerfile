# syntax=docker/dockerfile:1.6

FROM node:20-bookworm AS builder
WORKDIR /app

# Install dependencies and build the TypeScript project
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY db-sample.json ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db-sample.json ./db-sample.json
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CORN2P_DATA_DIR=/data
VOLUME ["/data"]

CMD ["entrypoint.sh"]
