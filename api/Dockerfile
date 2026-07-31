# ---- deps de produção ----
# O toolchain (python3/make/g++) vive só aqui: o argon2 compila binário nativo
# via node-gyp na instalação, mas nada disso precisa sobrar na imagem final.
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY package*.json ./
RUN npm ci --omit=dev

# ---- build ----
# Estágio separado porque o nest build precisa das devDependencies.
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---- runtime ----
# openssl + libc6-compat: sem eles o schema engine do Prisma não sobe no Alpine.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
USER node
EXPOSE 3001
# exec form + `exec node`: faz o node virar PID 1 e receber o SIGTERM do deploy,
# senão o shutdown hook não roda e as conexões do Neon ficam penduradas.
# nest build gera dist/src/main.js (não dist/main.js) porque o tsconfig
# inclui prisma/seed.ts, o que empurra o rootDir um nível acima de src/.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/src/main.js"]
