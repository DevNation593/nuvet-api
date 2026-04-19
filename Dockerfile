FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY types ./types
RUN pnpm install --frozen-lockfile --prod=false

# --- Build ---
FROM deps AS build
WORKDIR /app
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json nest-cli.json ./
RUN pnpm prisma generate
RUN pnpm run build:types
RUN pnpm exec nest build

# --- Production deps only ---
FROM base AS production-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY types ./types
RUN pnpm install --frozen-lockfile --prod

# --- Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
