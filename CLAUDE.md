# CRM Doctor Quality

## Stack
- Monorepo: api/ (NestJS 10 + Prisma + PostgreSQL/Neon) e web/ (Next.js 16 App Router + Tailwind + TypeScript).
- Next.js 16: middleware.ts virou proxy.ts (função exportada como `proxy`). Não use o nome antigo.
- Auth: JWT + argon2. Guard global; rotas liberadas com @Public().
- Rate limit: @nestjs/throttler (teto global 100 req/60s por IP; /auth/login 5/60s). Precisa de `trust proxy` 1 no main.ts pra ler o IP real atrás do EasyPanel.

## Convenções
- Nomes de domínio em português (Lead, EmpresaCliente, Projeto, Interacao, Ticket, Consultor, Visita, Notificacao, Cargo). Código em camelCase.
- Permissão nunca vai no payload do JWT. O token assina só `{ sub }`; cargo, permissões e status saem do banco no validate() da JwtStrategy, a cada request. É o que faz desativar membro, trocar cargo e resetar acesso valerem na hora, e não no próximo login (o token dura 7 dias).
- Sessão inválida é 401, não 403: conta inexistente, desativada, com convite pendente ou com token anterior à senha atual. O front trata 401 limpando a sessão e mandando para o login.
- Acesso via @RequirePermissao('modulo:acao') + PermissionsGuard. Sem permissão = 403. Cargo sem permissão = não vê nada.
- Hierarquia usa só Cargo.nivel: só gerencia quem tem nivel menor. Nunca comparar por nome de cargo.
- Todo input da API usa DTO com class-validator. Nunca receber body sem validação.
- Banco só via PrismaService (módulo global). Nunca instanciar PrismaClient direto.
- Datas: timestamptz no banco, ISO 8601 na API. Timezone: America/Sao_Paulo.
- Proibido `any`. Erros seguem o HttpExceptionFilter padrão.
- No front, toda chamada HTTP passa por src/lib/api.ts. Tipos em src/types espelham a API.
- Não instalar libs novas sem avisar antes.
- Módulo novo no NestJS segue exatamente o padrão de leads/.

## Identidade visual
- Use só os tokens do tailwind.config: brand (#6E1C24 vinho), accent (#DB3645 vermelho), ink (#212121), surface (#F5F5F5), night (#0E0D0D). Proibido hex solto no JSX.
- Botão primário é vinho (brand), nunca vermelho. Vermelho é só acento, alerta e badge.
- Títulos: font-black, leading-none. Labels: uppercase, tracking-wide, font-light, text-xs.
- Fundo do app claro, cards brancos rounded-card shadow-card, sidebar e header em night.
