# CRM Doctor Quality

## Precedência de instruções

1. O que o Nicolas pede no chat da sessão atual
2. Este arquivo
3. `ENTREGA.md`, que é a fila corrente
4. Demais documentos do repositório
5. Prompts e relatórios de sessões anteriores, que são histórico e não regra

Entre os documentos de estado: `CHECKUP-GERAL.md` e `POR-QUE-O-CRM.md` são o
retrato atual. `RELATORIO-SESSAO-04-08.md` é histórico e já se contradisse.
Nunca bloqueie um pedido do Nicolas citando fila ou escopo de sessão anterior.

Pedido que contraria este arquivo ou o `web/AGENTS.md` é executado assim mesmo,
com uma linha dizendo qual regra foi contrariada. Ele decide depois se atualiza
o documento.

## Autorizações permanentes

Pré-autorizado, sem perguntar: editar código, criar tela e componente,
refatorar, escrever teste, migration aditiva contra a branch de dev, instalar
biblioteca quando o item da fila exigir, e toda decisão de gosto (cor, texto,
ícone, nome, espaçamento, estrutura de arquivo, forma do teste).

Parada obrigatória, avise em uma linha e espere "vai":

1. Qualquer coisa irreversível em produção: apagar linha, dropar ou renomear
   coluna, migration destrutiva
2. `git push`
3. Mudança em auth ou hierarquia de nível que a fila corrente não peça
4. Primeira execução de um script novo em produção

Fora dessas quatro não existe bloqueio. Na dúvida se algo é bloqueio, não é.

## Procedimento para escrever em produção

Backup e confirmação do arquivo. Contagem das tabelas afetadas, incluindo
soft-deletadas. Resumo do script em três linhas e espera do "vai". Um script
por vez. Contagem de novo e comparação com o previsto. Divergiu, para.

## Segredos

Nunca pedir nem mostrar segredo no chat, nunca pedir log do EasyPanel.
Credencial nova vira passo a passo em `CHAVES-PENDENTES.md`, assumindo que ele
nunca abriu aquele painel: site, caminho, nome do botão, o que copiar, em qual
arquivo colar.

## Regra da classe

Correção de defeito de padrão (formatação, animação, validação, duplicação de
lógica, guarda de rota) só conta como feita com varredura do repositório
provando que sobrou zero. Defeito de instância única basta a medição do item.
Nunca afirmar estado sem medir.

## Texto de produto

Sem travessão.

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
- Datas: ISO 8601 na API. Timezone: America/Sao_Paulo. No banco quase tudo é `TIMESTAMP(3)` sem fuso (38 colunas); as únicas `TIMESTAMPTZ(3)` nossas são `visitas.inicio` e `visitas.fim`. Esta linha já disse "timestamptz no banco" e estava errada, conferido coluna por coluna em 07/08/2026.
- Dia civil: todo cálculo de dia contra campo `@db.Date` passa por `inicioDoDiaCivil` (`common/utils/dia-civil.ts`). Relógio UTC no servidor já causou erro de um dia em prazo de compliance, e o texto fica gravado na notificação sem conserto.
- Permissão nova entra em TRÊS lugares: `api/src/common/constants/permissoes.ts`, `web/src/types/index.ts` e `web/src/lib/permissoes.ts` (a lista que a tela de Cargos desenha). Esquecer o terceiro cria permissão que ninguém consegue conceder. Há trava de compilação cobrando isso.
- Proibido `any`. Erros seguem o HttpExceptionFilter padrão.
- No front, toda chamada HTTP passa por src/lib/api.ts. Tipos em src/types espelham a API.
- Lib nova: instala e avisa depois, dizendo qual e por quê. Não é caso de parar e perguntar.
- Módulo novo no NestJS segue exatamente o padrão de leads/.

## Identidade visual
- Use só os tokens do tailwind.config: brand (#6E1C24 vinho), accent (#DB3645 vermelho), ink (#212121), surface (#F5F5F5), night (#0E0D0D). Proibido hex solto no JSX.
- Botão primário é vinho (brand), nunca vermelho. Vermelho é só acento, alerta e badge.
- Títulos: font-black, leading-none. Labels: uppercase, tracking-wide, font-light, text-xs.
- Fundo do app claro, cards brancos rounded-card shadow-card, sidebar e header em night.
