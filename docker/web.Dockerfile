FROM node:22-bookworm-slim AS build
WORKDIR /workspace
ARG VITE_API_URL=http://app.attendity.local:8080/api/v1
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json tsconfig*.json ./
COPY apps apps
COPY packages packages
RUN npm ci
RUN npm run build -w @qr/types && npm run build -w @qr/shared && npm run build -w @qr/config && npm run build -w @qr/utils && npm run build -w @qr/ui && npm run build -w @qr/web

FROM nginx:1.29-alpine AS production
COPY docker/static-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
