# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set environment variables (NODE_ENV set after build to avoid skipping devDependencies)
ENV PORT=8080

# Install security tools and system updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user with minimal privileges
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (both production and dev) for building
# Note: NODE_ENV must not be 'production' here or npm ci will skip devDependencies
RUN npm ci && \
    npm cache clean --force && \
    chown -R nodejs:nodejs /app

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build the application
RUN npm run build

# Set production environment after build (devDependencies no longer needed at runtime)
ENV NODE_ENV=production

# Create logs directory with proper permissions before switching to non-root user
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist-server/index.js"]