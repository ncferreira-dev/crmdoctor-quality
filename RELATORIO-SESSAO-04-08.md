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

## Item 16: o erro de um dia no prazo de compliance existe, e foi consertado

**O defeito, medido.** O cron calculava "hoje" a partir do relógio UTC:

```ts
const hoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
```

Entre 21h e 23h59 de Brasília o UTC já está no dia seguinte. Como o cron também
roda **no boot do container**, e deploy à noite acontece, um container que sobe
às 22h calcula "hoje" como amanhã. Duas consequências:

1. A frase sai com um dia a menos. Prazo em 16/08 visto na noite de 04/08 vira
   "vence em 11 dias" em vez de 12.
2. O prazo que vence hoje fica **fora** da janela `gte: hoje` e não gera alerta
   naquela execução.

E o erro não se conserta sozinho: a mensagem é gravada pronta na notificação, e
o `@@unique([projetoId, tipo, dataReferencia])` impede regravar. O número errado
fica congelado até o prazo mudar.

**O conserto.** Camada de aplicação, sem migration. Nasceu
`api/src/common/utils/dia-civil.ts` com `inicioDoDiaCivil()` e `diasEntre()`. A
data civil vem do `Intl` com fuso `America/Sao_Paulo`, não de um `-3` fixo, para
não quebrar se o horário de verão voltar.

**Como sei que resolveu.** 12 testes novos, 58 no total (eram 46). O
`dia-civil.spec.ts` guarda a fórmula antiga dentro do teste e mede a diferença,
então ele **prova** o erro em vez de só afirmar que existia:

| Cenário | Antes | Agora |
|---|---|---|
| 8h de Brasília (cron agendado) | certo | certo, nada mudou |
| 23h30 de 04/08 (boot noturno) | janela começava em 05/08 | começa em 04/08 |
| 22h de 31/08 (virada do mês) | pulava para 01/09 | fica em 31/08 |
| Prazo vencendo hoje, às 23h30 | ficava fora do alerta | entra, com "vence em 0 dias" |

**O que NÃO consertei, e é decisão tua.** A mensagem guarda um número relativo
("vence em 12 dias") em texto fixo. Lida três dias depois, ela está errada por
três dias, e isso não tem nada a ver com fuso. O caminho certo é a tela calcular
a partir de `dataReferencia`, que já está gravada na notificação, e a mensagem
guardar só o fato. Mexe no texto de alerta que já existe no banco, então parei
aqui.

**Varredura.** Procurei o mesmo padrão no resto da API
(`getUTCDate`, `setHours`, `Date.UTC`): o cron era o único lugar. O front já
tinha sido corrigido ontem com `formatarDataCivil`.

## Item 17: o corte silencioso no registro 101

**Por que era pior do que parece.** Onze lugares da interface pediam
`?limit=100` e usavam o que voltasse. E 100 não era um número escolhido: é o
teto do `@Max(100)` no `PaginacaoDto` da API, ou seja, pedir mais devolve 400.
Passando de 100 registros, o resto sumia **sem nenhum sinal**: o select
simplesmente não tinha a opção, e a pessoa não tinha como saber que a opção
existia. Com uma empresa faltando na lista, a visita é agendada na empresa
errada ou não é agendada.

**O conserto.** `api.getTodos<T>(rota)` em `web/src/lib/api.ts` percorre a
paginação da API até o fim, com as páginas seguintes em paralelo. Os onze
lugares passaram a usar isso. Não sobrou nenhum `limit=100` no código.

Tem trava: acima de 20 páginas (2000 registros) ele para e **avisa no console**
que aquela tela precisa de busca no servidor. O ponto é não repetir o defeito de
cortar calado.

**Como conferi, com 150 registros de verdade.** A `web/` não tem executor de
teste instalado (o `package.json` só tem dev, build, start e lint), e instalar
biblioteca está fora do meu envelope, então o teste foi feito no navegador
contra o banco local:

1. Inseri 150 competências `TESTE-PAGINACAO 001..150` no `crm_dq_local`.
2. Abri `/competencias`. A tela renderizou **as 150**, incluindo a 101 e a 150.
   Antes teria mostrado 100 e parado.
3. A aba de rede mostra as duas chamadas: `?page=1&limit=100` e
   `?page=2&limit=100`.
4. Apaguei as 150. O banco local voltou às 5 competências originais.

**O que fica para depois:** as telas de lista (Projetos, Tarefas, Competências)
continuam sem paginação na interface. Hoje elas carregam tudo, o que é correto e
lento; com milhares de registros vão precisar de busca no servidor de verdade. O
aviso no console é o gatilho para isso.

**Anotação que virou achado:** a `web/` não tem nenhum teste. Toda a rede de
segurança automatizada do projeto está na API. Instalar Vitest é decisão tua,
por causa da regra de não instalar biblioteca sem avisar.

## Decisão tua registrada: o cargo Consultor foi descartado

Você disse "não quero mais esse cargo consultor". Ele nunca chegou a existir no
banco, então não houve nada a desfazer em produção. O que fiz foi tirar o bloco
do `prisma/criar-cargos-iniciais.ts`, para ninguém criar por engano rodando o
script, e deixar escrito ali o porquê.

Nada no sistema dependia dele. Quem pode receber visita é definido pela
permissão `VISITAS_WRITE`, não pelo nome do cargo: é assim que a rota
`GET /visitas/consultores` monta a lista. O campo `User.especialidade` e o
vínculo com Competência continuam servindo para marcar quem faz trabalho de
campo, com o cargo que a operação quiser.

Aproveitei e escrevi no topo do script o aviso que faltava: o `upsert` regrava
por cima, e hoje rodá-lo tiraria `CONSULTORES_READ` e `CONSULTORES_WRITE` dos
três cargos de produção. São strings mortas desde que o módulo de consultores
foi apagado, então isso é limpeza. Medi comparando o script com o que a API de
produção devolve em `/cargos`.

## Fechamento da sessão 2

**Estado ao sair.** Branch `sessao-auto-04-08`, quatro commits, nenhum push,
como manda o envelope. API: typecheck limpo, 58 testes passando (eram 46), zero
erro de lint. Web: typecheck limpo, build de produção compila, zero erro de
lint. Conferido no navegador contra o banco local em `/dashboard`,
`/agenda`, `/projetos` e `/competencias`, sem erro no console.

**O que ficou de fora, e por quê.** Itens 18 a 23 (estados de carregamento e
erro, estados vazios, celular em 390px, acessibilidade, testes de permissão por
cargo, lista de rotas mortas) não foram começados. Preferi entregar três itens
fechados e conferidos a deixar seis pela metade na branch.

**Anotações que valem para o próximo turno:**

- O modal aberto pelo botão "+ Evento" se chama "Nova visita". A incoerência que
  o relatório de ontem previu está na tela.
- Os blocos de visita na célula do mês são `button` sem nome acessível. É a
  primeira coisa do item 21.
- A `web/` não tem executor de teste. Toda a rede automatizada está na API.

## Para o Nícolas ler primeiro

1. O prazo de compliance **estava errado em um dia** quando o container subia
   entre 21h e meia-noite, e o número errado ficava congelado na notificação.
   Consertado e provado com teste (item 16). Está na branch, não em produção.
2. Toda lista de opção do sistema **cortava calada no registro 101**. Agora
   carrega tudo, conferido com 150 registros de verdade (item 17).
3. Nada quebrou: 58 testes verdes, build compilando, telas conferidas.
4. O cargo Consultor foi tirado do script, como você pediu. Nunca existiu no
   banco, então não houve nada a desfazer.
5. Depende de você: dar push nesta branch, e decidir sobre o Vitest na web, que
   hoje não tem nenhum teste.

---

# Sessão 3 (05/08/2026, manhã)

## Estado verificado ao chegar

| O que | Como conferi | Resultado |
|---|---|---|
| `.env` local | `grep -o 'ep-[a-z0-9-]*'` | `ep-rapid-dew`, a branch de dev. Não é produção, seguro |
| Árvore | `git status` | Limpa, sem stash, nada pela metade |
| Branch | `git checkout sessao-auto-04-08` | Idêntica à `main`, que já foi para produção ontem |
| API | typecheck, 58 testes, eslint sem `--fix` | Tudo verde, zero erro |
| Web | typecheck, eslint | Verde, 2 avisos antigos de `exhaustive-deps` |
| Produção | `/health/cron` e front | No ar, sem novidade durante a noite |

Nenhuma MENTIRA encontrada no relatório da sessão 2.

## O erro de método que quase me fez consertar o que não estava quebrado

Vale registrar porque muda como conferir tela daqui para frente.

Abri o modal Novo projeto e medi: painel com 48px de largura, campos com 26px,
Prazo e Valor **sobrepostos**, fundo em `opacity: 0.357`. Parecia a confirmação
exata dos itens 1, 2 e 3 da tua lista.

Era artefato do meu ambiente. A Browser pane estava **oculta**, e janela oculta
não recebe `requestAnimationFrame`. Descobri porque um laço de rAF que eu mandei
rodar simplesmente nunca terminou, e a chamada estourou em 30 segundos. Sem rAF,
duas coisas acontecem juntas: o motor do `motion` congela no primeiro quadro, e o
viewport reportado encolhe. Depois de fixar o viewport em 1280x800 com
`resize_window`, os mesmos campos mediram 226px cada, lado a lado, sem
sobreposição nenhuma.

**Regra que fica:** medir layout sem antes fixar o viewport, nesta ferramenta,
mede o ambiente e não o produto.

## Item 1: os botões de estágio NÃO estão quebrados, e o que achei no lugar

**Não reproduz.** Testei no navegador, logado como CEO, pelo caminho do usuário:

| Passo | Resultado |
|---|---|
| Clicar "Execução" | Marca muda na hora |
| Ler o projeto na API logo depois | `EXECUCAO` gravado |
| Clicar "Concluído" | Muda, e a API confirma `CONCLUIDO` |
| Voltar para a lista pelo link e entrar de novo | Continua "Concluído" |
| Badge do projeto na lista | Acompanhou, mostra "Concluído" |

A rota, o DTO, a permissão e o service estão certos, e a tela faz atualização
otimista com desfazer em caso de erro.

**Duas hipóteses do que você viu.** A primeira é o congelamento de animação
descrito acima, que também acontece em navegador comum quando a aba está em
segundo plano: o modal e os overlays ficam presos no primeiro quadro. A segunda
é a tela `/projetos`, onde existe uma fileira de botões **Diagnóstico, Proposta,
Execução, Concluído com exatamente o mesmo desenho** da trilha de estágio, mas
que são **filtro**, não mudança de estágio. Clicar ali de fato não muda estágio
nenhum, e nada na tela avisa que aquilo é outra coisa. Registro como dívida de
interface, não como defeito de código.

### Auditoria dos controles que mudam estado

Cada um exercitado contra a API local e relido depois:

| Controle | HTTP | Persistiu |
|---|---|---|
| Estágio do projeto | 200 | sim, e sobrevive à navegação de ida e volta |
| Status do ticket (`PATCH /tickets/:id/status`) | 200 | sim |
| Status da visita | 200 | sim |
| Conclusão de tarefa | 200 | sim |
| Marcar alerta como lido | 200 | sim |

**Armadilha achada de passagem, e ela é séria.** O `ValidationPipe` global roda
com `whitelist: true` e **sem** `forbidNonWhitelisted`. Campo que não existe no
DTO é descartado em silêncio, com resposta 200. Medido: `PATCH /tickets/:id` com
`{ status: 'RESOLVIDO' }` responde **200 e não muda nada**, porque
`UpdateTicketDto` não tem `status` (o certo é `/tickets/:id/status`, que é o que
a tela usa). Hoje nenhuma tela cai nessa armadilha, mas ela é uma fábrica de
"cliquei e não aconteceu nada". Não liguei `forbidNonWhitelisted` porque isso
muda o contrato de todas as rotas de uma vez e passaria a devolver 400 para
qualquer front que mande um campo a mais. **É decisão tua**, e recomendo ligar.

## Item 1b: o defeito real que estava embaixo, e esse eu consertei

O `Modal` animava a entrada com `motion`, cujo motor depende de
`requestAnimationFrame`. Quando o rAF não roda (aba em segundo plano, janela
oculta, navegador economizando bateria), a animação congela no primeiro quadro e
o modal fica **preso em `opacity: 0.357` com escala 0.98**, ilegível, com os
campos amassados. Medido nesta base, parado indefinidamente nesse valor.

É o mesmo bug de família do que derrubou a tela em 04/08 pelo `AnimatePresence`,
agora pelo outro lado: lá o nó não saía, aqui ele não chega.

**Conserto:** a entrada virou CSS (`overlay-fundo`, `overlay-painel` e `surgir`
em `globals.css`), com uma regra que passa a valer para o sistema inteiro: **o
estado final é o estado base, e a animação só tira dali e devolve.** Se a
animação não rodar, o elemento aparece pronto em vez de sumir. O painel do sino
de notificações tinha o mesmo `initial={{ opacity: 0 }}` e recebeu o mesmo
tratamento. A Sidebar já era imune por desenho (anima só `x`, nunca `opacity`), e
está documentado lá desde a sessão anterior.

Conferido depois do conserto, com a janela ainda oculta: fundo e painel em
`opacity: 1`, modal legível.

## Item 2: sobreposição não existe no desktop, mas o aperto no celular era real

Em 1280px, Prazo de compliance e Valor medem 226px cada, lado a lado, sem
sobreposição. Em 390px mediam **149px cada**, que é menos do que um campo de data
nativo precisa para mostrar `dd/mm/aaaa` mais o ícone de calendário.

Troquei `grid-cols-2` por `grid-cols-1 sm:grid-cols-2` nos quatro lugares do
sistema que tinham duas colunas fixas: `ProjetoFormModal`, `VisitaFormModal` e
dois grids do `LeadFormModal`. Conferido nas duas larguras: em 390px os campos
empilham com 310px cada, e em 1280px continuam lado a lado.

### Correção do próprio item 1b, meia hora depois

A primeira versão do conserto trocou `motion` por animação CSS e eu escrevi aqui
que estava resolvido. **Estava errado, e o teste seguinte me desmentiu:** com a
janela oculta o modal voltou a medir `opacity: 0`. Animação CSS também congela
com a página escondida, e o `from { opacity: 0 }` segurava o painel invisível. Eu
tinha trocado o motor, não o defeito.

O que resolve de verdade é **não animar `opacity` em nada que precise estar
visível**. As animações agora mexem só em `transform`, então animação parada só
pode deixar o painel alguns pixels deslocado. Invisível, nunca. É o mesmo desenho
que a Sidebar já usava desde que ficou invisível uma vez, agora escrito como
regra em `globals.css` e valendo para todo overlay.

Medido de novo, com `document.visibilityState === 'hidden'`, que é o pior caso:

| Medida | Resultado |
|---|---|
| Opacidade do fundo e do painel | 1 e 1 |
| Painel | 504 x 652, legível |
| Esc fecha | sim |
| Overlay sobrando depois de fechar | zero |

## Fechamento da sessão 3

**Estado ao sair.** Branch `sessao-auto-04-08`, três commits novos, nenhum push.
API com typecheck limpo, 58 testes passando, zero erro de lint. Web com typecheck
limpo, build de produção compilando, zero erro de lint. Modal conferido no
navegador nas larguras de 1280px e 390px, e no pior caso de janela oculta.

**Nenhuma migration foi criada nem rodada.** Os itens 9, 10 e 11 do bloco C
dependem de migration e ficaram sem começar, então o banco de dev não foi tocado.

**O que não foi feito, em ordem de valor para a próxima sessão:**

| Item | Situação |
|---|---|
| 3, formato de data unificado | Não começado. É o de maior valor: `dd/mm/aaaa` já foi mexido antes e voltou |
| 4, "Nova tarefa minha" | Não começado |
| 5 e 6, filtros da agenda e agenda no celular | Não começados |
| 7 e 8, tarefa para outros membros e campo de prazo | Não começados |
| 9, 10 e 11, campos novos com migration aditiva | Não começados |
| 13 a 15, fuso, celular e estados de carregamento | Não começados. O item 13 já tinha sido resolvido na sessão 2 (é o item 16 de lá), com 12 testes |

Foi menos item do que a fila pedia. A troca foi consciente: o item 1 desmontou
como reprodução e virou uma investigação que achou um defeito diferente e pior,
e ainda me pegou publicando um conserto errado, que precisou ser refeito. Preferi
três coisas medidas a oito escritas no escuro.

**Uma dívida de interface que registro sem executar:** na tela `/projetos`, os
botões de filtro por estágio são visualmente idênticos à trilha de estágio da
tela de projeto, e não há nada dizendo que um filtra e o outro muda o dado. Meu
palpite é que foi isso que você clicou. Consertar é mudar o desenho do filtro, o
que mexe numa tela que você não pediu para mexer, então fica anotado.

## Para o Nícolas ler primeiro

1. **Os botões de estágio funcionam.** Testei pelo caminho do usuário e a
   mudança persiste, sobrevive à navegação e atualiza o badge da lista.
2. **Achei outro defeito no lugar, e ele é do sistema inteiro:** com a aba em
   segundo plano, todo modal congelava no meio da animação, ilegível e com os
   campos amassados. Consertado, e a regra agora é: animação nunca decide se
   algo é visível.
3. **Errei uma vez no meio e me corrigi:** o primeiro conserto trocou o motor da
   animação sem resolver o defeito, e o teste seguinte mostrou isso. Está no
   relatório com o antes e o depois.
4. **Campos de formulário no celular** paravam em 149px de largura e agora
   empilham. Vale para os quatro formulários do sistema.
5. **Uma decisão sua:** a API aceita campo que não existe no DTO, responde 200 e
   ignora em silêncio. Hoje nenhuma tela cai nisso, mas é uma fábrica de
   "cliquei e não aconteceu nada". Ligar `forbidNonWhitelisted` resolve e passa a
   devolver 400. Recomendo ligar, mas mexe no contrato de todas as rotas.

## Item 3: a data unificada, e por que ela "voltava"

**A raiz.** O `19 de ago. de 2026` nunca esteve no nosso código. Vinha do campo
nativo `<input type="date">`, que é desenhado pelo **navegador**, e cada um
escolhe o formato conforme o idioma do sistema operacional. Num Mac em português
ele escreve por extenso enquanto o resto do CRM escreve 19/08/2026. O texto vive
dentro do shadow DOM do navegador, então não existe CSS nem propriedade nossa que
mude aquilo. É por isso que "já foi arrumado e voltou": não havia o que arrumar
do nosso lado, e qualquer conserto anterior só podia ter sido em outro lugar.

**A saída.** Escrever o campo, em vez de pedir ao navegador. Nasceu
`web/src/components/ui/CampoData.tsx`, o campo de data único do sistema:

- Campo de texto com máscara `dd/mm/aaaa`, idêntico em qualquer navegador.
- Digitação só de números funciona: `20122026` vira `20/12/2026` sozinho.
- Botão de calendário ao lado abre o seletor nativo (`showPicker`, com `focus`
  como reserva onde ele não existe), que continua sendo o melhor jeito no
  celular.
- Um campo oculto com o mesmo `name` carrega `aaaa-mm-dd`, então **nenhum
  formulário precisou mudar** como lê os dados.
- Data impossível é recusada: `31/02/2026` não vira nada e a tela avisa. Sem
  isso o `Date` do JavaScript "conserta" para 03/03 em silêncio, e data que se
  conserta sozinha é pior que data recusada.
- A conversão lê a data da string, sem fuso, pela mesma razão do
  `formatarDataCivil`: campo `@db.Date` não tem hora, e passar por
  America/Sao_Paulo joga para o dia anterior.

**Aplicado em todos os campos de data do sistema:** prazo de compliance do
projeto, prazo do marco e prazo da tarefa. Não sobrou nenhum `type="date"` na
base fora do próprio componente.

**Conferido no navegador, logado como CEO:**

| O que testei | Resultado |
|---|---|
| Abrir Editar projeto | Campo mostra `18/09/2026`, formulário carrega `2026-09-18` |
| Digitar `20122026` | Vira `20/12/2026`, envia `2026-12-20` |
| Digitar `31022026` | Fica na tela, envia vazio, e avisa "Data inválida" |
| Apagar tudo | Campo e valor enviados ficam vazios |
| Salvar `20/12/2026` | API grava `2026-12-20`, tela mostra `20/12/2026`, sem erro de um dia |
| Modal de marco e de tarefa | Mesmo campo, mesmo comportamento |
| 390px de largura | Campo com 305px, botão de calendário de 24x24 dentro dele, página não estoura |

**O que ficou de fora:** o modal de visita usa `datetime-local` (data mais
hora), que é outro componente e não entrou aqui. Fica anotado como o próximo
passo natural deste item.

## Item 4: "Nova tarefa minha"

Era um título literal, não concatenação: `tituloProprio="Nova tarefa minha"` na
tela de tarefas. Virou "Nova tarefa", que é o que a pessoa espera ler quando a
tarefa é dela mesma.

Varri os outros nove títulos de modal do sistema. Todos usam frase inteira em
cada ramo ("Editar projeto" / "Novo projeto"), nenhum monta texto por pedaço. O
único composto é "Nova tarefa para Fulano", que é proposital e lê bem.

## Decisão sobre os estágios do projeto: manter os quatro, e fazer com que signifiquem algo

Pedido: decidir se os quatro estágios devem ganhar função ou ser removidos.

**Não remover, e o motivo não é apego.** Remover valor de enum é migration
destrutiva num banco em produção, o que aciona a regra zero e depende do
Nícolas, e o ganho funcional seria zero: o sistema continuaria funcionando
igual. Fase de projeto é informação de gestão barata e padrão numa consultoria
que toca vários contratos ao mesmo tempo, e o dashboard já conta projetos por
estágio.

**O que estava errado não era existirem, era mentirem.** Três defeitos:

1. **Ninguém sabia o que cada um queria dizer.** Quatro palavras sem definição
   em lugar nenhum, nem no guia mestre, nem no código. Campo sem significado
   vira campo preenchido no chute.
2. **Só "Concluído" tem consequência, e ela era invisível.** Marcar concluído
   desliga o alerta de prazo (o cron pula projeto concluído), tira o selo de
   prazo das listas e sai da conta de prazos em risco. Nada na tela dizia isso.
   Desligar a cobrança sem avisar é exatamente a falha silenciosa que esta base
   já pagou caro para aprender a evitar.
3. **O filtro da lista era visualmente idêntico ao controle.** Mesmas quatro
   palavras, mesmo desenho, um filtra e o outro muda o dado.

**O que fiz, sem migration nenhuma:**

- `ESTAGIO_PROJETO_DESCRICAO` em `lib/formato.ts`: cada estágio ganhou uma frase
  que aparece na tela do projeto, mudando conforme o estágio atual. A de
  Concluído diz, com todas as letras, que o projeto para de gerar alerta.
- Contador "1 de 4" ao lado do título, para a trilha se ler como progresso.
- Botão **"Avançar para X"**, que move para o próximo estágio sem a pessoa ter
  que adivinhar qual das quatro palavras clicar. Some quando chega em Concluído.
- Na lista, o filtro ganhou o rótulo **"FILTRAR POR"** na frente, para parar de
  se passar pelo controle.

**Conferido no navegador:** avancei os três passos seguidos, e a cada clique a
API gravou (`PROPOSTA`, `EXECUCAO`, `CONCLUIDO`), o contador andou (2, 3, 4 de
4), a descrição trocou junto e o botão sumiu ao chegar no fim. Depois devolvi o
projeto de demonstração ao estágio original.

**As definições que escrevi são proposta minha**, não vieram de lugar nenhum
porque não existiam. Trocar o texto é uma linha por estágio, sem migration.

**Achado em produção, e ele é sério.** O único projeto que existe lá,
`Novalgina Linha 9`, com prazo em 10/08, foi marcado como **CONCLUÍDO** às 08h59
de hoje. Com isso ele parou de gerar alerta de compliance, e o dashboard mostra
zero alerta em aberto. Se aquilo foi um teste de clique e não uma conclusão de
verdade, o projeto precisa voltar para o estágio anterior, senão o prazo de
10/08 passa sem ninguém ser avisado.

## Item 5: os filtros da agenda filtravam, menos o que mais importa

**Metade do item não reproduziu.** Testei os quatro controles na visão Lista,
cada um sozinho e combinados, e todos já funcionavam: sem filtro 3 visitas;
por empresa TransLog, 1 e só dela; por consultor Marcos, 1; consultor mais
status Cancelada, nenhuma e o estado vazio na tela; busca "hospital", 1;
busca "zzzz", nenhuma e estado vazio.

**A outra metade reproduziu, e era o que dava a sensação de filtro quebrado.**
Na visão Mês, os filtros nunca valeram para as marcas de **prazo de
compliance**. Medido: filtrando por TransLog, as visitas caíam de 7 para 2 e as
**três** marcas de prazo continuavam na tela, duas delas de outras empresas. Do
lado de quem usa, isso é "filtrei e continua aparecendo coisa de quem eu tirei".

**Conserto.** O prazo passou a respeitar os filtros que ele tem como responder:

| Filtro | O que acontece com as marcas de prazo |
|---|---|
| Empresa | Só ficam os prazos daquela empresa |
| Busca | Procura também no título do projeto e no nome da empresa |
| Consultor | Somem. Ninguém é responsável por uma data vencer |
| Status | Somem. Prazo não fica "confirmado" nem "cancelado" |

Conferido depois: sem filtro, 7 visitas e 3 prazos; por TransLog, 2 visitas e
1 prazo, o dela; por consultor, 3 visitas e nenhum prazo; buscando "dermocosm",
nenhuma visita e o prazo do projeto que casa com o texto.

O campo de busca virou **"Buscar eventos"**, como pedido, e agora o nome está
correto por um motivo a mais: a busca alcança as duas coisas que a agenda
mostra, visita e prazo.

## Item 6: a agenda no celular começava pelos filtros

Em 390px a busca mais os três seletores empilhavam em quatro linhas inteiras e
empurravam o calendário para baixo. Medido: o calendário começava a 462px do
topo, ou seja, mais da metade da tela ia embora antes do primeiro dia aparecer.

Agora, **só no celular**, os filtros ficam atrás de um botão **Filtros**, com um
contador de quantos estão ativos para nenhum recorte ficar escondido e
esquecido. No desktop nada mudou: o botão não existe e os filtros seguem sempre
à vista.

Conferido nas duas larguras:

| Medida | Resultado |
|---|---|
| Topo do calendário em 390px, painel fechado | 273px, contra 462px antes |
| Painel começa fechado | sim |
| Filtro aplicado e painel fechado | filtro continua valendo (2 visitas) e o botão mostra "Filtros 1" |
| Limpar o filtro | contador some |
| Em 1280px | botão escondido, busca e os três seletores sempre visíveis |

## Item 15: erro de carregamento deixa de ser beco sem saída

**O que estava errado.** Todas as telas tratavam erro, mas do mesmo jeito ruim:
uma frase cinza com a mensagem crua da API (`Failed to fetch`) e nada mais. A
única saída era a pessoa saber que recarregar a página resolve. Pior em
Competências, Cargos e Membros: se a carga falhava, a lista ficava `null` para
sempre e o **esqueleto pulsava eternamente**, com um errinho vermelho em cima.
A tela mentia dizendo que ainda estava buscando.

**Nasceu `web/src/components/ui/EstadoErro.tsx`**, o estado de erro único do
sistema:

- Frase humana: "Não foi possível carregar os projetos."
- Explicação do que fazer, com texto diferente quando a causa é rede.
- Botão **Tentar de novo**, que refaz a chamada sem sair da tela.
- A mensagem técnica só aparece em letra miúda quando não é falha de rede.

**Aplicado em nove telas:** Dashboard, Empresas, Empresa (detalhe), Projetos,
Projeto (detalhe), Agenda, Membros, Competências, Cargos e Minhas tarefas.

Onde a tela também mostra erro de **ação** (excluir que falhou), os dois foram
separados: erro de ação continua sendo o aviso curto acima da lista, porque a
lista está na tela e funcionando; erro de **carga** vira o bloco com botão.

**Como conferi, e este teste vale registrar:** derrubei a API local e naveguei
pelas telas.

| Tela | Com a API fora |
|---|---|
| Projetos | "Não foi possível carregar os projetos", explicação de rede e botão |
| Competências | Mesmo bloco, e **zero esqueleto pulsando** |
| Minhas tarefas | Mesmo bloco, uma única mensagem, sem duplicar |
| Jargão técnico na tela | nenhum |

Depois subi a API de volta e cliquei em **Tentar de novo** sem recarregar a
página: o erro sumiu, a tela carregou o conteúdo e a rota continuou a mesma.

## Item 14: passada no celular, em 390px

Medi cada tela principal em 390px procurando três coisas: conteúdo estourando a
largura, alvo de toque pequeno demais e texto cortado.

**O que estava certo:** nenhuma tela estoura a largura. Empresas, Projetos,
Competências e Cargos passaram limpas.

**O que consertei:**

| Onde | Estava | Ficou |
|---|---|---|
| Seletor de status de tarefa, na tela de Membros | 27px de altura, quatro deles na tela | 36px, e continua mais baixo que um campo de formulário |
| Botão "Marcar como lida", no painel de alertas | 26px de altura | 36px |
| Valor em execução, no dashboard | "R$ 167.500" cortava dentro do cartão | Um ponto menor só no celular, e nunca corta |

O tamanho mínimo de 36px não é gosto: quem usa este sistema usa em campo, com o
celular na mão, e alvo de 26px erra o toque. No desktop nada mudou, o seletor
compacto continua compacto e o número do dashboard continua grande.

**A agenda já tinha sido resolvida no item 6**, e é a que mais doía: os filtros
tomavam metade da primeira tela.
