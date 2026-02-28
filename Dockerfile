FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/apps/api/src/main.js"]
