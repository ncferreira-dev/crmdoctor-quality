# API do CRM Doctor Quality

Backend do CRM de compliance (Life Science). NestJS 11 + Prisma 5 + PostgreSQL (Neon).

## Rodar local

Contra o Postgres da sua máquina, e só contra ele:

```bash
npm install
createdb crm_dq_local
npm run prisma:local -- migrate deploy
npm run start:local
```

Sobe em http://localhost:3001.

**Os dois comandos carregam `.env.local`, e isso é o ponto.** Qualquer comando
que rode sem carregar esse arquivo pega o `.env`, que aponta para um Neon
remoto. Foi por isso que `start:dev` e `start:debug` deixaram de existir em
09/08/2026: eles prometiam subir a API aqui e conectavam lá.

Três arquivos, três bancos:

| Arquivo | Aponta para | Quem carrega |
|---|---|---|
| `.env.local` | Postgres da sua máquina | `start:local`, `prisma:local`, `email:teste` |
| `.env` | Neon `vercel-dev`, **credencial morta** | a CLI do Prisma, sozinha, quando ninguém manda outra coisa |
| `.env.producao` | Neon `production` | nenhum script sozinho: só `backup:producao`, invocado de propósito |

O `.env` continua ali de propósito, mesmo morto: é o padrão da CLI do Prisma, e
um padrão que não conecta é rede de proteção. Um `npx prisma migrate dev`
distraído bate num banco que não existe, em vez de bater na produção.

Variáveis de ambiente (ver `.env.example`): `DATABASE_URL` e `DIRECT_URL`
(Neon, com e sem `-pooler`), `JWT_SECRET`, `SEED_ADMIN_PASSWORD`, `PORT`, `TZ`,
`FRONTEND_URL`, `RESEND_API_KEY`, `EMAIL_REMETENTE`.

Endereços de produção: `docs/ENDERECOS.md` na raiz do repositório.

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
