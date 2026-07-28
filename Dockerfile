# syntax=docker/dockerfile:1

# ---- build ------------------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app

ENV PNPM_HOME=/pnpm CI=true
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Install with the lockfile first so the dependency layer is cached independently of source changes.
# No BuildKit cache mounts: this has to build with a plain `docker build` as well, and the layer cache
# already covers the case that matters.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Reduce node_modules to production dependencies for the runtime stage. adapter-node's output still
# needs them at runtime, notably the postgres driver and the argon2 native binding.
RUN pnpm prune --prod

# ---- runtime ----------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

# CrossWire's own reader handles the compressed zText/zCom module formats; unzip expands uploaded
# raw ZIP packages into an isolated temporary SWORD library.
RUN apt-get update \
    && apt-get install -y --no-install-recommends diatheke unzip \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    BODY_SIZE_LIMIT=Infinity \
    UPLOAD_DIR=/app/var/uploads

# Resource imports read the uploaded file back from disk, so the directory must survive restarts;
# it is mounted as a volume in compose.yaml.
RUN mkdir -p /app/var/uploads && chown -R node:node /app/var

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run in the entrypoint rather than at image build time: they need the live database.
CMD ["sh", "-c", "node scripts/migrate.ts && node build/index.js"]
