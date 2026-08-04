# Relatório da sessão de 04/08/2026

15 commits locais na `main`, **nenhum push**. Nada foi a produção.

Typecheck limpo nos dois lados, lint com zero erros, 46 testes passando, build
de produção do front compila.

---

## O que fiz

Em ordem cronológica, com o hash para reverter item a item.

| Hash | O que mudou |
|---|---|
| `36e8f56` | JWT lê permissão e status do banco a cada request |
| `01b10fb` | Modal e menu mobile deixavam overlay invisível travando a tela |
| `b1dd213` | `<button>` dentro de `<button>` na célula do calendário |
| `50aa821` | Prazo de compliance aparecia um dia antes do real |
| `0ab98bd` | Painel de alertas no dashboard |
| `c65c292` | Visita pertence a projeto, prazo na agenda, botão "+ Evento" |
| `530a391` | `npm run start:local` para rodar contra banco da máquina |
| `e6ac777` | Cabeçalho fixo com o sino de notificações |
| `82d3a21` | Tela "Minhas tarefas" |
| `8ad87c4` | Data por função, copy com artigo, validação do design system |
| `b5ad397` | Fim dos travessões e prazo com desenho por tipo |
| `9955759` | Card "Tickets abertos" discordava da lista |
| `1a8dbc4` | Tela de ticket passa a dizer o que o chamado é |
| `05eb2fa` | Telefone pessoal restrito na lista de Membros |
| `cf98db7` | Migrations de ticket e projeto escritas, não aplicadas |

### Os três defeitos que mais importavam

**O sistema travava depois do primeiro modal aberto.** `AnimatePresence`
(motion 12.43 + React 19.2 + Next 16) rodava a animação de saída até o fim e
nunca removia o nó. Sobrava um `fixed inset-0 z-50` com `opacity: 0` e
`pointer-events: auto` cobrindo tudo: o modal sumia da vista e engolia todo
clique seguinte, e só recarregar a página resolvia. Mesmo defeito na gaveta do
menu no celular, o que matava o app no primeiro toque no menu. Como o Modal é
o de todas as telas, isto valia para o sistema inteiro.

**Prazo de compliance aparecia um dia antes do real.** Campos `@db.Date` chegam
como `2026-08-16T00:00:00.000Z`, e converter para America/Sao_Paulo joga para as
21h do dia anterior. O alerta chegava a se contradizer na mesma linha: "vence em
12 dias" ao lado de 15/08.

**Card de tickets discordando da lista.** Duas causas: a regra de "em aberto"
existia escrita à mão em dois services, e a lista de tickets mexia nos dados sem
avisar a página que mostra o número.

---

## O que verifiquei no navegador, e como

Não há Playwright no projeto e não instalei nada. A conferência foi manual,
contra um ambiente local isolado que montei nesta sessão.

**Como reproduzir o ambiente:**

```bash
createdb crm_dq_local
```

Depois, na pasta `api/`: `npm run prisma:local -- migrate deploy` e
`npm run start:local`. O front sobe com `npm run dev` na pasta `web/`. O
`api/.env.local` (fora do git) aponta para o Postgres da máquina, então nada
disso toca banco do Neon.

**Contas de teste no banco local**, todas com a mesma senha `local12345`:
`ceo@teste.com`, `coordenadora@teste.com`, `analista@teste.com`,
`consultor1@teste.com`, `consultor2@teste.com`.

| O que olhei | Onde | O que confirmei |
|---|---|---|
| Modal abre e fecha | `/agenda`, clicar numa visita | Zero nós remanescentes no DOM depois de fechar |
| Menu mobile | 375x812, botão de menu | Gaveta sai do DOM ao fechar |
| Prazo correto | `/dashboard`, painel de alertas | "vence em 4 dias" ao lado de 08/08, batendo |
| Alertas | `/dashboard` | Marcar como lida derruba badge, card e lista juntos, de 3 para 2 |
| Agenda com projeto | `/agenda`, visão Mês | Prazo aparece no dia certo, com desenho diferente de visita |
| Vínculo persiste | Criar visita com projeto, reabrir | Volta preenchida |
| Projeto de outra empresa | POST /visitas | 400 com mensagem explicando |
| Cabeçalho e sino | Todas as telas | Some no desktop para quem não tem NOTIFICACOES_READ |
| Minhas tarefas | `/tarefas` | Concluir move de grupo e carimba no banco; reabrir volta |
| Fim da visita | Modal de visita | Nasce +1h, arrasta com o início, para de arrastar se editado |
| Validação | Salvar visita vazia | Quatro mensagens embaixo dos campos, foco no primeiro |
| Estados vazios | Empresa sem contato | "Sem contato cadastrado" mais botão de adicionar |
| Card de tickets | Reabrir ticket resolvido | Card vai de 0 para 1 junto com a lista |
| Tela de ticket | Registrar resposta | "Em atraso" some, linha vira "Respondido em" com a hora |
| Telefone | `/membros` | Coordenador vê só o próprio; CEO vê os quatro |

Conferido como **CEO, Coordenador, Analista e Consultor**, em 1280x800 e
375x812.

---

## O que NÃO fiz, e por quê

**Push e deploy.** Push na `main` dispara a Vercel sozinha, e deploy é decisão
tua. Os 15 commits estão parados aqui.

**Nenhuma migration aplicada.** As duas que escrevi estão em
`api/prisma/migrations-preparadas/`, que o Prisma não lê. Confirmei com
`migrate status`: o banco continua "up to date". Elas não vão junto no próximo
Implantar.

**Contar linhas em produção.** Impossível hoje: o `api/.env` aponta para
`ep-rapid-dew`, que é a branch `vercel-dev`, e a conexão nem responde mais. A
produção é `ep-sweet-salad` e essa string não está em lugar nenhum na máquina.
É o que trava a regra zero e, com ela, toda migration.

**Fechar o telefone na API.** A tela deixou de mostrar, mas `/users` continua
devolvendo o número para quem tem `USUARIOS_READ`. Fechar de verdade muda o que
a rota retorna por cargo, e isso é RBAC, que precisa da tua aprovação.

**Timeline de interações e conversão de lead.** Fora da fila que combinamos.

---

## Decisões de gosto que tomei sozinho

Todas reversíveis com uma linha, revise quando puder:

1. **O cabeçalho some no desktop para quem não tem `NOTIFICACOES_READ`.** Sem o
   sino ele fica vazio, e uma faixa de 56px em branco é desperdício para o
   Consultor, que trabalha em campo. No celular ele fica, porque o botão de menu
   mora lá. O custo é o layout não ser idêntico entre cargos.

2. **Não coloquei título de página no cabeçalho.** Cada tela já tem o seu `h1`, e
   a agenda tem título dinâmico com controles ao lado.

3. **"+ Evento" em vez de "Nova visita"**, como pedido, mas veja a proposta de
   modelagem no fim deste relatório antes de considerar isso resolvido.

4. **Grupos de "Minhas tarefas" por urgência**, não por status: Atrasadas, Para
   hoje, A caminho, Sem prazo, Concluídas.

5. **Tipo de serviço virou `datalist`**, não tabela nova. Sugere os tipos já
   usados e continua aceitando um tipo novo. Sem migration.

6. **Telefone visível só para quem gerencia membros e para o dono do número.**
   Lado conservador, como combinado.

7. **Dia sem visita na visão de semana diz "Livre"**, no lugar do traço.

8. **Prazo de compliance ganhou ícone de escudo**; marco virou pílula vazada;
   tarefa virou texto com ponto. A cor continua sendo só urgência.

---

## O que precisa da tua decisão

Em ordem de importância.

1. **As duas strings do Neon, branch `production`.** Destrava a regra zero e,
   com ela, as migrations preparadas, o prazo de ticket e o período de projeto.
   O passo a passo está na conversa; se preferir, escrevo de novo.

2. **Deploy dos 15 commits.** Um deles carrega a migration
   `20260804180000_vincular_visita_a_projeto`, que roda no boot do container. É
   aditiva e segura de rodar duas vezes, mas ainda assim é uma migration que
   não foi conferida contra a contagem de produção.

3. **Manter ou reverter a correção do JWT.** Mexer em auth precisa da tua
   aprovação, e eu mexi antes de conhecer essa regra. Está em `36e8f56`, isolado
   num commit só.

4. **Consultor deve receber tarefa?** Hoje o cargo não tem `TAREFAS_READ`, então
   não vê a tela. É ajuste na tela de Cargos, sem código.

5. **A modelagem da agenda**, abaixo.

---

## A proposta de modelagem que você pediu (item 15)

Renomear o botão para "+ Evento" foi o pedido, e está feito. Mas você mesmo
levantou a questão certa: se a agenda passa a comportar mais que visita, isso
muda o significado da entidade `Visita`. Trocar só o texto é dívida.

Hoje a agenda mostra duas coisas de origens diferentes: `Visita`, que é um
compromisso com hora de início e fim e um consultor responsável, e o
`dataLimiteCompliance` do `Projeto`, que é uma data sem hora e sem dono, que eu
passei a desenhar como marca de prazo. São naturezas distintas: ninguém
comparece a um prazo, ele só vence.

### Opção A: não unificar nada

`Visita` continua sendo visita. A agenda é uma tela que sabe ler várias fontes
e desenhar cada uma do seu jeito, que é o que ela já faz hoje com prazo de
projeto. Marco de projeto entraria da mesma forma, sem tabela nova.

Custo: cada fonte nova exige código na agenda. Ganho: nenhuma migration,
nenhuma entidade genérica, e cada coisa continua se chamando pelo nome.

### Opção B: criar `Evento` como entidade genérica

Uma tabela `eventos` com `tipo` (VISITA, REUNIAO, PRAZO), início, fim opcional
e vínculos opcionais com empresa, projeto e responsável. `Visita` viraria um
`Evento` de tipo VISITA.

Custo: migration destrutiva de verdade, com migração de dados, exatamente a
classe de mudança que já derrubou esta produção. E entidade genérica com campo
`tipo` costuma virar tabela com metade das colunas nula, cada tipo usando um
subconjunto diferente.

Ganho: uma fonte só para a agenda ler.

### Opção C: `Visita` ganha um campo de natureza

`Visita.natureza` (VISITA_TECNICA, REUNIAO, TREINAMENTO), coluna anulável com
default. O nome da tabela continua `visitas`, o significado se alarga um pouco,
e a agenda passa a comportar compromisso que não é visita de campo.

Custo: uma migration aditiva pequena. A entidade fica com nome que não descreve
mais exatamente o que ela guarda.

### O que eu recomendo

**Opção A, e o botão volta a se chamar "Nova visita".**

O motivo é o que a agenda comporta hoje: uma coisa que se cria (visita) e uma
que só se lê (prazo de projeto). O botão cria; e a única coisa que ele cria é
visita. "+ Evento" promete um seletor de tipos que não existe, e prometer na
interface o que o modelo não tem é como o card de alertas virou beco sem saída.

Se a operação realmente precisar marcar reunião interna e treinamento na mesma
agenda, aí a Opção C resolve com uma coluna, sem inventar entidade genérica. A
pergunta que decide isso não é técnica: **a equipe marca compromisso que não é
visita a cliente?** Se a resposta for não, "+ Evento" é um nome bonito para
nada.

Deixei o botão como "+ Evento" porque foi o pedido explícito. Reverter é uma
palavra em `AgendaCalendar.tsx`.

---

## Como reverter

Um commit por assunto, na ordem inversa se for reverter mais de um:

```bash
git revert cf98db7   # migrations preparadas
git revert 05eb2fa   # telefone restrito
git revert 1a8dbc4   # tela de ticket
git revert 9955759   # card de tickets
git revert b5ad397   # travessões e selo de prazo
git revert 8ad87c4   # data, copy e validação
git revert 82d3a21   # Minhas tarefas
git revert e6ac777   # cabeçalho e sino
git revert 530a391   # script start:local
git revert c65c292   # visita com projeto
git revert 0ab98bd   # painel de alertas
git revert 50aa821   # data civil
git revert b1dd213   # botão aninhado
git revert 01b10fb   # overlay travando a tela
git revert 36e8f56   # JWT
```

`c65c292` é o único que envolve schema: reverter o código não desfaz a coluna
`visitas.projetoId` se ela já tiver sido aplicada em produção. Sendo anulável,
deixar a coluna lá não quebra nada.

Para jogar a sessão inteira fora, sem tocar em nada anterior:

```bash
git reset --hard origin/main
```

---

# Sessão 2 (04/08/2026, a partir das 20h25)

## Estado verificado ao chegar

Conferi tudo por fora antes de escrever qualquer linha. O que segue é medição,
não leitura do relatório acima.

### Bateu

| O que o relatório afirma | Como conferi | Resultado |
|---|---|---|
| Typecheck limpo nos dois lados | `tsc --noEmit` na api e na web | Limpo |
| 46 testes passando | `npx jest` | 7 suítes, 46 testes, verde |
| Árvore de trabalho limpa | `git status` | Nada modificado, nada pela metade |
| Migrations locais em dia | `_prisma_migrations` no `crm_dq_local` | As 7 aplicadas, nenhuma falha |
| Painel de alertas no dashboard | Navegador, `/dashboard` como CEO | 2 alertas listados, com data e botão de baixa |
| Sino no cabeçalho | Mesma tela | Badge com 2, botão rotulado |
| Prazo de projeto na agenda | `/agenda`, visão Mês | Marca PRAZO com desenho próprio, separada da visita |
| Overlay invisível corrigido | Abri e fechei o modal e medi o DOM | Esc fecha, zero elemento `fixed` com z-index alto sobrando, e `elementFromPoint` no centro devolve conteúdo da página |
| Console limpo | DevTools nas telas visitadas | Nenhum erro |
| `.env` local não aponta para produção | `grep -o 'ep-[a-z0-9-]*' api/.env` | `ep-rapid-dew`, que é a branch `vercel-dev`. Seguro para continuar |

### Não bateu

**1. "Lint com zero erros" era meia verdade.** O `npm run lint` da api roda
`eslint --fix`. Ele conserta e sai verde, então o número zero é o resultado
depois do conserto, não o estado do código commitado. Rodando `eslint` sem
`--fix`, o código de ontem tinha **3 erros de formatação** em
`tickets.service.ts` e `tickets.utils.spec.ts`. Virou o item 0 desta sessão.

**2. O atalho "seguro" de rodar local apontava para banco remoto.** O contexto
afirma que `.claude/launch.json` tem as entradas `api-local` e `web`. Não tinha.
Tinha uma entrada `api` rodando `npm run start:dev`, que carrega o `.env` e
portanto conecta no Neon `vercel-dev`. Quem confiasse no atalho estaria mexendo
em banco remoto achando que estava na própria máquina. Corrigido no item 0.

**3. "15 commits locais, nenhum push. Nada foi a produção." deixou de valer.**
Os commits foram enviados às 19h51 e estão em produção desde as 20h04, front e
API. Conferido: o token que a API emite hoje traz só `sub`, `iat` e `exp`, que é
a assinatura da correção `36e8f56`. Como o container liga a API com
`prisma migrate deploy && node`, API no ar significa migration aplicada.

### Duas coisas que anotei de passagem

- O botão diz "+ Evento" e o modal que ele abre se chama "Nova visita". A
  incoerência é a mesma que o relatório de ontem levanta na proposta de
  modelagem, agora visível na tela.
- Os blocos de visita na célula do mês são `button` sem nome acessível. Entra no
  item 21.

## Item 0: lint de verdade e atalho local que não engana

`eslint` sem `--fix` na api voltou a dar zero erro, e `.claude/launch.json`
passou a ter `api-local` (que roda `start:local`, o do Postgres da máquina) em
vez de `api` (que rodava contra o Neon).

Critério de aceite: `npx eslint "{src,apps,libs,test}/**/*.ts"` na pasta `api`
termina com 0 erros, e subir o preview `api-local` conecta no banco da máquina.
Conferido: o heartbeat que a API local devolve é exatamente a linha gravada na
tabela `cron_execucoes` do `crm_dq_local`.
