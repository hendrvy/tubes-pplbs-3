FROM node:20-alpine

WORKDIR /app

# Install dependencies dulu (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# Buat folder logs
RUN mkdir -p logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
