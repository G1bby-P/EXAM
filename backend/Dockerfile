FROM node:22-alpine AS deps

WORKDIR /app
ENV CI=true
RUN corepack enable
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG DATABASE_URL=postgresql://replace-with-user:replace-with-password@localhost:5432/exam_platform?schema=public
ENV DATABASE_URL=${DATABASE_URL}
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm prisma:generate
RUN pnpm build

FROM deps AS production-deps

RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
RUN mkdir -p /app/storage && chown -R nestjs:nodejs /app/storage
COPY --from=production-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
USER nestjs
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

