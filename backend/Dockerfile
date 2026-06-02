FROM node:24-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY server.js ./
COPY config.json ./

EXPOSE 3001

CMD ["node", "server.js"]