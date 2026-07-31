# API — CRM Doctor Quality

Backend do CRM de compliance (Life Science). NestJS 11 + Prisma 5 + PostgreSQL (Neon).

## Rodar local

```bash
npm install
npx prisma migrate dev      # aplica migrations no banco de dev
npm run start:dev           # sobe em http://localhost:3001
```

Variáveis de ambiente (`.env`, ver `.env.example`): `DATABASE_URL` e `DIRECT_URL`
(Neon, com e sem `-pooler`), `JWT_SECRET`, `SEED_ADMIN_PASSWORD`, `PORT`, `TZ`,
`FRONTEND_URL`.

## Seed

```bash
npx prisma db seed          # cria o cargo Administrador e o usuário admin
```

## Convenções

Ver o `CLAUDE.md` da raiz. Em resumo: nomes de domínio em português, permissão
lida do banco a cada request (nunca no JWT), acesso via `@RequirePermissao`, banco
só via `PrismaService`, DTO com class-validator em todo input, proibido `any`.

## Deploy

Container no EasyPanel via `Dockerfile` (multi-stage; roda `prisma migrate deploy`
no boot). Detalhes na seção 6 do guia da raiz.
