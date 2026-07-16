FROM node:22-alpine AS deps

WORKDIR /app
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY next-env.d.ts next.config.js tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM deps AS production-deps

RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=production-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
