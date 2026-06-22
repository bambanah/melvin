ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base

RUN apk add --no-cache \
	python3 \
	make \
	g++ \
  libc6-compat

WORKDIR /app

# ============================================
# Stage 1: Install Dependencies
# ============================================
#
FROM base AS deps

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma/schema.prisma ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store corepack enable pnpm && pnpm i --frozen-lockfile

# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm build

# ============================================
# Stage 3: Run Next.js application
# ============================================

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

# Start next.js standalone server
CMD ["node", "server.js"]
