FROM node:20-alpine AS build
WORKDIR /app
# argon2 compila um binário nativo (node-gyp): precisa de python3/make/g++.
# openssl + libc6-compat: o schema engine do Prisma não sobe no Alpine sem eles.
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 3001
CMD npx prisma migrate deploy && node dist/src/main.js
