FROM node:22-bookworm-slim AS build
WORKDIR /workspace
ARG VITE_API_URL=http://attendity.local:8080/api/v1
ARG VITE_PORTAL_URL=http://app.attendity.local:8080/login
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PORTAL_URL=$VITE_PORTAL_URL
COPY package.json package-lock.json tsconfig*.json ./
COPY apps apps
COPY packages packages
RUN npm ci
RUN npm run build -w @qr/types && npm run build -w @qr/shared && npm run build -w @qr/ui && npm run build -w @qr/landing

FROM nginx:1.31-alpine AS production
COPY docker/static-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
