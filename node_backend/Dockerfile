FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
