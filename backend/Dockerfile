FROM node:22-alpine AS deps
WORKDIR /workspace/backend
COPY backend/package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /workspace
COPY --from=deps /workspace/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY shared ./shared
COPY tsconfig.base.json ./
RUN cd backend && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /workspace/backend/dist ./dist

EXPOSE 3001

CMD ["npm", "start"]
