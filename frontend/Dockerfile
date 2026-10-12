# Stage 1: Base & Dependencies
FROM oven/bun:1-alpine AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

# Stage 2: Development (used by docker-compose dev)
FROM base AS development
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev", "--host"]

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY . .
RUN bun run build

# Stage 4: Production (lightweight Nginx alpine)
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
