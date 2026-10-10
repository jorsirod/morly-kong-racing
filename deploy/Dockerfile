FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --cache /tmp/npm-cache
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=2567 DB_PATH=/app/data/races.sqlite
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --cache /tmp/npm-cache && rm -rf /tmp/npm-cache
COPY --from=build /app/build ./build
COPY --from=build /app/dist ./dist
RUN mkdir data && chown -R node:node /app
USER node
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:2567/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","build/server.mjs"]
