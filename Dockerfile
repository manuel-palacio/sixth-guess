# Build the static site, then run the Node server: static files plus the challenge API (Firestore-backed).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/game ./src/game
COPY --from=build /app/src/data ./src/data
USER node
EXPOSE 8080
# Node runs the TypeScript sources directly; CHALLENGE_KEY comes from Secret Manager on Cloud Run.
CMD ["node", "server/main.ts"]
