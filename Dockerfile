# syntax=docker/dockerfile:1
# Production image for Next.js standalone output (`next.config.js` → output: 'standalone').
# Build: docker build --build-arg NEXUS_BUILD_COMMIT_SHA=<40-char-sha> --build-arg NEXUS_RELEASE_TAG=<tag> -t aegis-vector .
# Run:   docker run --rm -p 3000:3000 -v nexus-data:/app/.nexus -e NEXUS_TOKEN=... aegis-vector

ARG NEXUS_BUILD_COMMIT_SHA=unknown
ARG NEXUS_RELEASE_TAG=unversioned

FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ARG NEXUS_BUILD_COMMIT_SHA
ARG NEXUS_RELEASE_TAG
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXUS_BUILD_COMMIT_SHA=${NEXUS_BUILD_COMMIT_SHA}
ENV NEXUS_RELEASE_TAG=${NEXUS_RELEASE_TAG}
LABEL org.opencontainers.image.revision=${NEXUS_BUILD_COMMIT_SHA}
LABEL org.opencontainers.image.version=${NEXUS_RELEASE_TAG}
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/.nexus \
  && chown nextjs:nodejs /app/.nexus

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
