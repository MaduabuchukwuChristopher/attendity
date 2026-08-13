FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json tsconfig*.json eslint.config.js ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci
COPY . .
RUN npm run build -w @qr/types && npm run build -w @qr/shared && npm run build -w @qr/api

FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/packages/types/dist packages/types/dist
COPY --from=build /workspace/packages/shared/dist packages/shared/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
