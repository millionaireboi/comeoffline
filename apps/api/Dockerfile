# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy package manifests for all workspaces (for dependency resolution)
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

# Install all dependencies
RUN npm ci

# Copy source code
COPY packages/types/ packages/types/
COPY packages/tsconfig/ packages/tsconfig/
COPY apps/api/ apps/api/

# Build the API and its dependencies
RUN npx turbo build --filter=@comeoffline/api

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy root workspace files
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built output
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/types/dist packages/types/dist

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
