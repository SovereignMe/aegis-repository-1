FROM node:22-alpine AS deps
WORKDIR /workspace

COPY package*.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.base.json ./
COPY backend ./backend
COPY shared ./shared
RUN cd backend && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci --omit=dev

COPY --from=build /workspace/backend/dist ./backend/dist

EXPOSE 3001

CMD ["node", "backend/dist/backend/src/server.js"]