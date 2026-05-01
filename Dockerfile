# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app

# OpenSSL and libc6-compat are required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies ----
FROM base AS deps

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- Builder ----
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# ---- Runner ----
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma runtime needs the generated client + schema.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
