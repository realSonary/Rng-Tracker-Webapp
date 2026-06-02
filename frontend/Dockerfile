# ---- Build stage ----
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . ./

# Set the backend URL at build time (default to http://backend:3001)
ARG VITE_SOCKET_URL=http://backend:3001
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ---- Production stage ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]