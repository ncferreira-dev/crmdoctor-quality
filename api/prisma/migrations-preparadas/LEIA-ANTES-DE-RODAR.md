# Migrations escritas e não aplicadas

Esta pasta **não é** `prisma/migrations`. O Prisma não olha para cá, e o
`prisma migrate deploy` do boot do container ignora o que está aqui. É de
propósito: são mudanças de schema já escritas, que ainda não podem rodar.

## Por que não rodaram

Duas razões, as duas do Nícolas:

1. **Migration precisa da aprovação dele.** Está na regra de alçada.
2. **A regra zero não pode ser cumprida hoje.** Antes de mexer em estrutura é
   preciso contar as linhas no banco de produção, incluindo as soft-deletadas.
   O `api/.env` aponta para `ep-rapid-dew`, que é a branch `vercel-dev`, e a
   produção é `ep-sweet-salad`. Sem essa string, ninguém conta nada.

Uma migration já derrubou esta produção por meia hora exatamente por pular
esse passo.

## Como aplicar, quando for a hora

Para cada uma, na ordem:

1. Contar as linhas da tabela alvo em produção, incluindo `excluidoEm` não nulo.
2. Mover a pasta da migration para `prisma/migrations/`.
3. Aplicar a mudança correspondente no `schema.prisma` (o bloco está anotado no
   comentário de cada SQL).
4. Rodar `npx prisma generate` e conferir o typecheck.
5. Deploy. O `migrate deploy` do boot aplica.

Se o boot falhar, o erro real aparece só na primeira tentativa; depois vira
P3009 em loop. A consulta que mostra a causa está no documento de contexto, na
seção do incidente de 04/08.

## O que tem aqui

| Pasta | O que muda | Destrava |
|---|---|---|
| `20260805100000_ticket_prazo_e_autor` | `Ticket.prazoResposta`, `Ticket.abertoPor` | Prazo de SLA por ticket e quem abriu do lado do cliente |
| `20260805110000_projeto_periodo` | `Projeto.dataInicio`, `Projeto.terminoEsperado` | Saber há quanto tempo um projeto se arrasta |

Todas são aditivas: criam coluna anulável e não apagam nem renomeiam nada.
Mesmo assim cada uma abre com uma trava que aborta se encontrar estado
inesperado, porque migration que roda no boot do container derruba a API
quando falha.
