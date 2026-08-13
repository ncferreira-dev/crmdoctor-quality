# Checkup geral do CRM Doctor Quality

> ## Este documento é o retrato de 09/08/2026, e o veredito dele já não vale
>
> **Atualizado em 12/08/2026.** O que segue abaixo é a auditoria que ORIGINOU o
> programa de entrega, com as medições de antes do conserto. Foi ela que virou
> a fila do `ENTREGA.md`. Ficou aqui inteiro de propósito: apagar o retrato de
> antes apaga a prova de que os defeitos existiram e de que foram medidos, não
> supostos.
>
> **O que mudou desde então, medido:** dos 43 itens da fila, 42 estão fechados e
> 1 ficou de fora por decisão registrada. O verificador (`npm run entrega:check`)
> saiu de **8 de 32** neste dia para **46 de 46** em 12/08/2026, sem nenhuma
> checagem vermelha. Os testes automáticos saíram de 78 para **226 na API** e
> **38 no front**, que nem sequer tinha executor de teste quando isto foi
> escrito.
>
> **O "não coloque um cliente pagante usando isto" da seção 1 foi respondido
> item por item:** o alerta virou aviso de uma pessoa, com leitura individual e
> prazo vencido dentro da janela (item 1); nasceu o motor de e-mail, provado com
> mensagem recebida (item 2), e o disparo diário por destinatário (itens 3 e 4);
> as três contas `@teste.com` sem dono foram desativadas, e as outras três, que
> são de pessoas de verdade, ficaram por decisão registrada (item 8); o backup
> voltou a funcionar contra a produção e ganhou rotina no Neon (item 10); e a
> tela que travava no celular foi corrigida (item 16).
>
> **O que continua valendo desta auditoria, por decisão e não por esquecimento:**
> o aviso diário não chega em ninguém da equipe, porque a verificação do domínio
> (item 5) depende de acesso que não é do Nícolas, e a decisão foi não fazer
> agora. O alerta continua existindo dentro do CRM, no sino e no dashboard: quem
> abre o sistema vê. O custo está escrito no item 5 do `ENTREGA.md`.
>
> Para o estado de hoje, leia o **Painel de estado** no fim do `ENTREGA.md`.
> Para qualquer afirmação sobre o sistema atual, rode o verificador: ele mede,
> este texto lembra.

Feito em 09/08/2026, à noite. Nada foi consertado, nada foi commitado, nenhuma
migration rodou. O único arquivo escrito é este.

Ambiente da medição: banco `crm_dq_local` na máquina, API em `localhost:3001`,
front em `localhost:3000`, navegador em 1280x800 e 390px. Produção foi lida em
dois pontos: `prisma migrate status` (só leitura) e o backup de 07/08 que está
no Desktop. A produção não foi escrita em momento nenhum.

---

## 1. Veredito

**Quase, mas não. Não coloque um cliente pagante usando isto todo dia ainda.**

O sistema está bem construído por dentro: a hierarquia de cargos é real e
resiste a teste de escalada, desativar alguém corta o acesso no mesmo segundo,
soft delete e trilha de auditoria funcionam, e as telas são claras e bem
escritas. Isso não é fachada, eu testei.

O que impede é outra coisa: **o CRM não avisa ninguém de nada.** Não existe
e-mail, push, WhatsApp nem webhook. O alerta de compliance grava uma linha no
banco e espera alguém abrir a tela. Pior: prazo que já venceu para de gerar
alerta, e a caixa de alertas é uma só para a empresa inteira, então uma pessoa
marcando "lida" apaga o aviso de todo mundo.

Somando a isso 6 das 8 contas de produção serem `@teste.com` (duas delas com
senha ativa), backup sem rotina e existindo em cópia única neste Mac, e uma
tela que trava no celular numa condição já conhecida, a resposta é não. Nenhum
desses itens é uma reescrita: são de dias, não de meses.

---

## 2. As cinco coisas mais graves

### 1. O alerta de compliance não sai do banco, e some justo quando vence

`api/src/notificacoes/notificacoes.service.ts` é o único cron do sistema. Ele
cria linhas na tabela `notificacoes`. Varri a API inteira atrás de `resend`,
`nodemailer`, `smtp`, `twilio`, `webhook` e `fetch`: **zero ocorrências**.

E a janela é `{ gte: hoje, lte: hoje + 15 dias }`. Prazo com data anterior a
hoje fica de fora. Medido na tela agora: o projeto `Qualificação de transporte
termolábil` está **vencido há 8 dias** e o marco `Mapeamento térmico` **vencido
há 6 dias**, e nenhum dos dois aparece no sino, no dashboard ou em qualquer
lugar além do selo na lista de Projetos.

**Consequência prática:** o prazo regulatório de um cliente passa, o sistema
para de falar dele, e a primeira pessoa a saber é o cliente. Num CRM que se
chama Compliance, é o oposto do que o produto promete.

### 2. Seis das oito contas de produção são de teste, e duas entram hoje

Do backup de produção de 07/08:

| E-mail | Cargo | Situação |
|---|---|---|
| `coordenador@teste.com` | Coordenador | **senha ativa, entra agora** |
| `analista@teste.com` | Analista | **senha ativa, entra agora** |
| `analista2@teste.com` (Giovanna) | Analista | convite pendente |
| `analista3@teste.com` (Erica) | Analista | convite pendente |
| `analista4@teste.com` (Aline) | Analista | convite pendente |
| `joao@teste.com` | Coordenador | convite pendente |
| `profissionalncferreira@gmail.com` | Desenvolvedor | real |
| `Fabricio@drquality.com.br` | CEO | real |

O Coordenador em produção tem `EMPRESAS_WRITE`, `PROJETOS_WRITE` e
`USUARIOS_READ`. Ou seja, `coordenador@teste.com` apaga empresa e projeto de
cliente real. Os quatro `codigoConvite` estão gravados **em texto puro** no
banco (8 caracteres) e viajaram assim para dentro do arquivo de backup.

**Consequência prática:** quando o Fabrício mostrar o sistema para um cliente,
o cliente vai ver uma equipe formada por "Analista de Teste" e "joao". E são
seis portas de entrada que ninguém está vigiando.

### 3. O menu do celular abre invisível e engole todo toque

Este é o defeito que a sessão 1 chamou de mais grave e deu como resolvido.
Ele voltou, ou melhor: nunca saiu da Sidebar.

`web/src/components/layout/Sidebar.tsx:202` monta o fundo da gaveta como
`motion.div` com `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`. Animar
`opacity` é exatamente o que a sessão 3 proibiu e escreveu em `globals.css`
("o estado final é o estado base"). O `Modal` foi corrigido, o painel do sino
foi corrigido, a Sidebar não.

Medido agora, em 390px, com `document.visibilityState === 'hidden'` e **0
frames em 600ms**:

| Medida | Resultado |
|---|---|
| Gaveta no DOM depois de abrir | sim |
| `opacity` do fundo | **0** |
| `pointer-events` do fundo | **auto** |
| `elementFromPoint` no centro da tela | o próprio fundo |
| Clique num elemento da página chega nele | **não** |

Ainda: **Esc não fecha a gaveta** (não há handler de teclado nela, ao
contrário do Modal). E o comentário em `Sidebar.tsx:48` afirma que "o estado
inicial NÃO usa opacity: 0 nem esconde nada", o que é falso para o fundo logo
abaixo.

**Consequência prática:** o consultor em campo toca no menu, a tela não muda,
e o app fica morto até ele recarregar. Acontece quando o rAF está parado: aba
em segundo plano, celular voltando do bloqueio, economia de bateria. É a mesma
condição que já derrubou este sistema uma vez.

### 4. O alerta mente o prazo, e duas telas do sistema se contradizem

A mensagem da notificação é gravada pronta, com o número de dias dentro do
texto, e o `@@unique` impede regravar. Ela nunca mais é atualizada.

Medido agora, com as duas telas abertas no mesmo minuto:

| Onde | O que diz | Prazo real |
|---|---|---|
| Dashboard, painel de alertas | "Etapa Treinamento da equipe (...) **vence em 9 dias**" ao lado de 13/08/2026 | 4 dias |
| Tela do projeto, mesmo marco | "**Vence em 4 dias**" | 4 dias |

Hoje é 09/08. O dashboard erra por cinco dias, e é a primeira tela que a
pessoa vê ao entrar. A sessão 2 identificou isso e deixou como "decisão tua".
Quatro dias depois, continua na tela.

**Consequência prática:** a informação mais importante do produto, quanto tempo
falta para um prazo regulatório, está errada na tela onde ela mais é lida. E
está errada para menos nunca, sempre para mais: o alerta sempre parece menos
urgente do que é.

### 5. Alerta é caixa única da empresa, e qualquer um silencia para todos

`Notificacao` no `schema.prisma` não tem `usuarioId`. Não existe destinatário.

Medido: logado como CEO, marquei um alerta como lido. Depois consultei a API
com o token da Coordenadora e com o do Analista.

| Quem | Não lidas antes | Não lidas depois |
|---|---|---|
| CEO | 2 | 1 |
| Coordenadora | 2 | **1** |
| Analista | 2 | **1** |

**Consequência prática:** ninguém é dono de nenhum alerta, e por isso ninguém
responde por ele. Qualquer pessoa, inclusive por engano no celular, apaga o
aviso de prazo regulatório da empresa inteira, sem deixar registro de quem foi
(`Notificacao` também está fora da auditoria).

---

## PARTE 1: o que as sessões automáticas realmente fizeram

### Antes da tabela, três correções de premissa

**1. A branch `sessao-auto-04-08` não existe.** Nem local, nem remota, nem
como tag. `git show-ref` devolve só `refs/heads/main` e `refs/remotes/origin/main`.
O próprio relatório registra o desaparecimento dela na sessão 6, linha 1252.

**2. Não existe nada parado na sua máquina.** `git rev-list --left-right --count
origin/main...main` devolve `0 0`. A `main` tem **101 commits** e está idêntica
ao GitHub. O último é `aa1d330`, de **07/08/2026 18:20**, ou seja, dois dias
atrás. Árvore de trabalho limpa, sem stash.

A frase "15 commits locais, nenhum push" que abre o relatório valeu por menos
de três horas: os commits foram enviados às 19h51 de 04/08. A própria sessão 2
corrige isso na linha 307.

**3. Não foram três sessões, foram seis**, de 04/08 a 07/08, todas dentro do
mesmo arquivo de 1415 linhas.

### Tabela item a item

Abri o código e a tela de cada um.

| Item | O relatório diz | O código faz | A tela faz | Veredito |
|---|---|---|---|---|
| Overlay invisível travando a tela (Modal) | Corrigido, animação nunca mexe em `opacity` | `Modal.tsx` usa CSS, keyframes só com `transform`, tem handler de Esc | Abre e fecha, zero overlay sobrando, `elementFromPoint` devolve conteúdo da página | **Confere** |
| Mesmo defeito na gaveta do celular | Corrigido | `Sidebar.tsx:202` ainda anima `opacity` via `motion` | Fundo fica `opacity 0` com `pointer-events auto`, clique não passa | **Mentira** |
| Prazo de compliance com erro de um dia | Corrigido com `inicioDoDiaCivil`, 12 testes | `dia-civil.ts` usa `Intl` com America/Sao_Paulo, não `-3` fixo | Datas conferem na tela | **Confere** |
| Corte silencioso no registro 101 | "Não sobrou nenhum `limit=100` no código" | `api.getTodos` percorre a paginação; **mas `KanbanBoard.tsx:40` ainda usa `?limit=${LIMITE_BOARD}` com `LIMITE_BOARD = 100`** | Tela de Leads está fora do menu | **Parcial** |
| Campo de data unificado (`CampoData`) | "Não sobrou nenhum `type="date"` na base fora do próprio componente" | Verdade para `type="date"`; **`VisitaFormModal.tsx:284` e `:293` usam `datetime-local` nativo** | O modal de visita continua com data desenhada pelo navegador | **Parcial** |
| Estágio do projeto ganhou significado | Descrição por estágio, contador, botão "Avançar para" | `ESTAGIO_PROJETO_DESCRICAO` em `formato.ts` | "3 de 4", frase do estágio, botão "Avançar para Concluído" | **Confere** |
| Filtro de projeto ganhou rótulo "FILTRAR POR" | Feito | Sim | "FILTRAR POR" na frente dos botões, filtro funciona | **Confere** |
| Filtros da agenda alcançam o prazo | Corrigido | Sim | Medido: sem filtro 7 visitas + 3 prazos; por TransLog 2 + 1; busca sem resultado 0 + 0 | **Confere** |
| Agenda no celular começa pelo calendário | Topo em 273px, botão Filtros | Sim | Medido: 273px, botão "Filtros" presente, zero estouro horizontal | **Confere** |
| `EstadoErro` em nove telas | Frase humana, botão Tentar de novo, sem jargão | Usado em 11 arquivos | **Erro 403 aparece como "Isso costuma ser passageiro. Tente de novo" e mostra "Permissão necessária: USUARIOS_READ"** | **Parcial** |
| Alvo de toque mínimo de 36px no celular | Três pontos corrigidos | Só os três | Agenda em 390px tem **16 alvos abaixo de 36px**: Mês/Semana/Dia/Lista com 28px, setas com 30px, chips de visita com **19px** | **Parcial** |
| Linha do tempo de interações | Empresa e projeto, separadas | `Timeline.tsx` usado nos dois | Vi o histórico na empresa e no projeto, separados, com estado vazio bom | **Confere** |
| Edição de ticket ligada | `PATCH /tickets/:id` ganhou tela | Sim | Botão "Editar" em cada ticket | **Confere** |
| Cargo fora do alcance não é oferecido | `<option disabled>` no cadastro | Sim, por `cargo.nivel >= meuNivel` | **Mas a lista de Membros continua oferecendo "Editar", "Resetar senha" e "Desativar" em quem está no mesmo nível.** Medido: os dois devolvem 403 | **Parcial** |
| Nome e e-mail param de entrar com espaço | `@Transform` no DTO, 5 testes | Sim, cobre create e update | **Os dois nomes já gravados continuam errados em produção: "Giovanna " e "Erica "** | **Parcial** |
| Equipe do projeto | Migration aditiva, bloco na tela | Migration `20260805170000` aplicada em produção | Bloco "EQUIPE / 2 pessoas" aparece. **Some por completo quando o projeto não tem ninguém**, sem caminho para atribuir | **Parcial** |
| Valor de contrato restrito por `FINANCEIRO_READ` | API não devolve o valor | `projetos.service.ts` filtra na origem | Medido: `valor: null` para quem não tem a permissão, para todos os cargos | **Confere** |
| Checkbox "Financeiro" na tela de Cargos | Criado, com trava de compilação | `TodaPermissaoTemCheckbox` existe em `lib/permissoes.ts` | Tela de Cargos renderiza os grupos | **Confere** |
| Nenhum cargo podia ser salvo | Corrigido na leitura | Sim | Medido: `PATCH /cargos/:id` devolvendo a mesma lista do `GET` responde 200 | **Confere** |
| `prisma/` entrou no lint | Feito | `package.json` cobre `{src,apps,libs,test,prisma}` | `npx eslint` sem `--fix`: 0 erros | **Confere** |
| Exportador de backup pega relação N-N | Corrigido, 241 para 249 registros | Sim | Backup de 07/08 tem `_EquipeDoProjeto` com 8 vínculos | **Confere** |
| 12 rotas sem tela | Contagem corrigida para 12 | Refiz a varredura e a conferência manual: **12**, os mesmos | n/a | **Confere** |
| 78 testes passando | 12 suítes, 78 testes | `npx jest`: 12 suítes, 78 testes, verde | n/a | **Confere** |
| "Typecheck limpo nos dois lados" | Afirmado nas sessões 1 a 5 | **`npx tsc --noEmit` na api sai com código 1 e 2 erros** | n/a | **Mentira** (ver abaixo) |
| Lint zero nos dois projetos | Sessão 6 | `npx eslint` sem `--fix`: 0 erros e 0 avisos, api e web | n/a | **Confere** |
| `next build` compila | Sessão 6 | Rodei: compila, 16 rotas geradas | n/a | **Confere** |

### O typecheck da API está quebrado e ninguém viu

```
src/users/users.service.spec.ts(52,18): error TS2571: Object is of type 'unknown'.
src/users/users.service.spec.ts(117,12): error TS2571: Object is of type 'unknown'.
```

A causa é a própria limpeza de lint da sessão 6: os mocks viraram
`jest.fn<Promise<unknown>, [unknown]>()`, e o `mock.calls[0][0].data` que os
testes já liam passou a ser acesso a `unknown`. Passou despercebido porque
`tsconfig.build.json` exclui `**/*spec.ts`, então `nest build` continua verde,
e a sessão 6 só verificou "`tsc --noEmit` limpo **no front**".

Ou seja: o script `npm run typecheck` da api falha hoje, e o relatório
afirmou seis vezes que estava limpo.

### O que foi prometido e ficou pela metade

1. **Mensagem de alerta com número relativo congelado.** Levantado na sessão 2,
   marcado como "decisão tua", nunca feito. É o item 4 da lista de graves.
2. **`forbidNonWhitelisted` no ValidationPipe.** A sessão 3 mediu que a API
   aceita campo fora do DTO, responde 200 e ignora em silêncio. Confirmei em
   `main.ts:16`: continua só com `whitelist: true`. Recomendado e não decidido.
3. **Telefone fechado na API.** A sessão 1 escreveu que a tela deixou de mostrar
   mas `/users` continua devolvendo. Medido hoje: continua. Ver Parte 5.
4. **`datetime-local` no modal de visita.** Marcado como "próximo passo natural"
   do item 3. Não foi feito.
5. **Nomes com espaço já gravados em produção.** "edição de 30 segundos pelo
   Nícolas". Continuam lá.
6. **`Novalgina Linha 9` marcado como CONCLUÍDO por engano.** A sessão 3 avisou,
   com todas as letras, que o prazo de 10/08 passaria sem ninguém ser avisado.
   Confirmado no backup: continua `CONCLUIDO`, prazo `2026-08-10`. **É amanhã.**
7. **Vitest na web.** A web continua sem executor de teste nenhum.
8. **Cópia do backup fora da máquina, rotina de backup, monitor no `/health/cron`.**
   Os três seguem sem lugar definido.
9. **Botão "+ Evento" com modal "Nova visita".** Anotado nas sessões 1 e 2.
   Medido hoje: o botão diz "Evento", o modal diz "Nova visita".

### O que foi feito sem estar na fila

Para ser justo, quase tudo isto foi feito com o seu aval registrado no próprio
relatório. O que apareceu por iniciativa da sessão, e não da fila:

- **Correção do JWT (`36e8f56`).** A própria sessão 1 registra que mexeu em auth
  antes de conhecer a regra de alçada e pediu sua decisão depois. Foi para
  produção. Está certo tecnicamente (ver Parte 5), mas entrou fora do processo.
- **Linha do tempo de interações (sessão 4).** Escolha da sessão, com o
  argumento de ser o maior valor sem depender de migration. Não estava na fila.
- **Exportador e importador de backup (sessão 6).** Nasceu de uma varredura de
  limpeza.
- **Cenário de demonstração montado direto na produção**, com prazos remarcados
  e 5 alertas marcados como lidos. Mexeu em dado de produção para efeito de
  apresentação.
- **`prisma/` no lint, 105 arquivos reformatados.** Limpeza não pedida, embora
  bem justificada.

---

## PARTE 2: verificação tela por tela e cargo por cargo

### Antes: duas ressalvas honestas sobre o ambiente

**1. O `npm run dev` do front estava quebrado quando cheguei.** Toda página
respondia 500 e a tela ficava branca. Causa: o Opensquad criou
`/Users/nicolas/package-lock.json` em 08/08 às 10h21, e o Turbopack passou a
eleger `/Users/nicolas` como raiz do workspace, quebrando a resolução de
módulos. O `next.config.ts` não fixa `turbopack.root`, então qualquer lockfile
acima da pasta do projeto derruba o dev. **Produção não é afetada** (a Vercel
usa Root Directory `web`), e `next build` compila normalmente. Movi o lockfile
para rodar o checkup e devolvi no fim. Vale fixar `turbopack.root`.

**2. Os cargos do banco local não são os da produção.** Local tem
Administrador (100), CEO (100), Coordenador (60), Analista (30) e Consultor
(20), com 21/21/19/15/6 permissões e **nenhum** com `FINANCEIRO_READ`.
Produção tem Desenvolvedor (110), CEO (100), Coordenador (60) e Analista (30),
com 24/22/21/16. Testei como **CEO** no lugar de Desenvolvedor, que é o cargo
de topo disponível aqui. O caso positivo de `FINANCEIRO_READ` (alguém que
**pode** ver valor) não é reproduzível localmente.

### Matriz tela x cargo

Legenda: OK = carrega, mostra dado certo e o cargo vê o que deve.

| Tela | CEO (topo) | Coordenador | Analista | Observação |
|---|---|---|---|---|
| Login | OK | OK | OK | Rate limit de 5/60s disparou corretamente no 6º login |
| Dashboard | OK | OK | OK | Sem card para prazo vencido; alerta com texto congelado |
| Empresas (lista) | OK | OK | OK | Busca filtra de verdade; vazio diz "Nenhuma empresa encontrada" |
| Empresa (detalhe) | OK | OK | OK | Tickets, histórico e estados vazios bons. CNPJ sem máscara |
| Projetos (lista) | OK | OK | OK | Filtro por estágio funciona; "FILTRAR POR" presente |
| Projeto (detalhe) | OK | OK | OK | Bloco Equipe **some** quando não há ninguém |
| Agenda | OK | OK | OK | Filtros medidos e corretos; botão "Evento" abre "Nova visita" |
| Minhas tarefas | OK | OK | OK | "Da equipe" só aparece com `USUARIOS_READ`; conclusão persiste |
| Membros | OK | **Parcial** | **Falha** | Coordenador vê só o próprio telefone na tela, mas a API entrega todos. Analista por URL recebe erro errado |
| Competências | OK | OK | OK (só leitura) | |
| Cargos | OK | **Falha** | **Falha** | Menu esconde, mas a URL direta renderiza o mapa inteiro de permissões |
| Perfil | OK | OK | OK | |
| Sino de notificações | OK | OK | OK | Caixa única: marcar lida vale para todos |

### Menu por cargo (medido no DOM)

| Cargo | Itens visíveis |
|---|---|
| CEO | Dashboard, Empresas, Projetos, Agenda, Minhas tarefas, Membros, Competências, Cargos |
| Coordenador | os mesmos **menos Cargos** |
| Analista | Dashboard, Empresas, Projetos, Agenda, Minhas tarefas, Competências |

Correto em todos os três.

### Controles que mudam estado: persistem depois de recarregar?

Cada um exercitado na tela e relido no banco.

| Controle | HTTP | Persistiu | Como conferi |
|---|---|---|---|
| Status de ticket (Aberto para Em andamento) | 200 | **sim** | Recarreguei a página, `select` voltou `EM_ANDAMENTO` |
| Conclusão de tarefa | 200 | **sim** | Banco: `status=CONCLUIDA`, `concluidaEm=2026-08-09 23:25`, `atualizadoPorId` preenchido, linha nova em `audit_logs` |
| Notificação lida | 200 | **sim** | Badge caiu de 2 para 1 na hora; API confirma para os três cargos |
| Estágio de projeto | n/a | n/a | Não reexecutei; a auditoria da sessão 3 mediu, e a rota, o DTO e o service estão corretos |
| Status de visita | n/a | n/a | Idem |

Nenhum caso de "cliquei e não aconteceu nada".

### Filtros e busca

| Onde | Sozinho | Combinado | Vazio |
|---|---|---|---|
| Empresas, busca por nome | "Vitalis" devolve 1 | n/a | "zzzznaoexiste" devolve "Nenhuma empresa encontrada" |
| Projetos, filtro por estágio | "Em andamento" devolve 2 de 5 | n/a | não testado |
| Agenda, empresa | TransLog: 7 visitas para 2, 3 prazos para 1 | busca + empresa consistentes | busca "zzzz": 0 visitas e 0 prazos |
| Tarefas, escopo | "Da equipe" muda título e traz 3 em aberto | filtro por frente aparece só no modo equipe | estado vazio bom |

Filtram de verdade, sozinhos e combinados.

### Datas

**Formato: consistente, com uma exceção.** Todo campo `@db.Date` do banco
(`Tarefa.prazo`, `Projeto.dataLimiteCompliance`, `EtapaProjeto.prazo`,
`Notificacao.dataReferencia`) passa por `formatarDataCivil`, que lê a data da
string sem tocar em fuso. Não sobrou nenhum `<input type="date">` fora do
`CampoData`.

**A exceção:** `VisitaFormModal.tsx:284` e `:293` usam `datetime-local` nativo.
Ali o navegador desenha a data, e num Mac em português ele escreve por extenso.
É exatamente o defeito que você reclamou que "já foi arrumado e voltou", ainda
vivo na tela mais usada por quem trabalha em campo.

**Erro de um dia perto da meia-noite:** não achei nenhum na API. O cron usa
`inicioDoDiaCivil` com `Intl` em America/Sao_Paulo, e o `dia-civil.spec.ts`
guarda a fórmula antiga dentro do teste para provar a diferença. **Um risco
residual fica no front:** `diasAteOPrazo` em `lib/formato.ts` usa
`new Date()` com `setHours(0,0,0,0)`, ou seja, a meia-noite **local do
navegador**. Numa máquina em Brasília está certo. Numa máquina configurada em
UTC, depois das 21h a conta anda um dia. Não é o caso hoje, mas é a mesma
classe de defeito que a API já pagou para consertar, e a regra não foi
estendida ao front.

### Console do navegador

Depois de limpar o cache envenenado e reiniciar, o console fica **limpo** em
todas as telas visitadas. Os erros que restam no buffer são das tentativas
anteriores à correção do ambiente. Zero erro de aplicação, zero warning de
React, nenhum aviso de hidratação.

### Requisições repetidas ou em cascata

| Tela | Chamadas à API |
|---|---|
| Dashboard | `/users/me`, `/dashboard/resumo`, `/notificacoes?lida=false`, uma vez cada |
| Empresa (detalhe) | `/empresas/:id`, `/projetos?empresaId`, `/tickets?empresaId`, `/interacoes` |
| Tarefas | `/tarefas?responsavelId`, e uma nova ao trocar de escopo |

Sem cascata e sem laço. As duplicatas em `/tickets` e `/interacoes` são o modo
estrito do React em desenvolvimento, como a sessão 6 já tinha medido.

**Um achado de eficiência:** `lib/api.ts` manda `Content-Type: application/json`
em **toda** requisição, inclusive nos GET sem corpo. Isso torna toda chamada
uma requisição "não simples" e força um **preflight OPTIONS antes de cada GET**.
Medido: cada chamada da tela aparece duas vezes na rede. Dobra o número de
viagens contra a API para nada.

---

## PARTE 3: saúde técnica

### Números

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` (api) | **FALHA**, código 1, 2 erros |
| `npx tsc --noEmit` (web) | limpo |
| `npx eslint` sem `--fix` (api, inclui `prisma/`) | 0 erros, 0 avisos |
| `npx eslint` (web) | 0 erros, 0 avisos |
| `npx jest` (api) | 12 suítes, **78 testes**, todos passando, 1,2s |
| `next build` | compila, 16 rotas |
| Testes na web | **nenhum**, não há executor instalado |

### O que os 78 testes cobrem de verdade

| Arquivo | Testes | O que realmente trava |
|---|---|---|
| `tickets.utils.spec.ts` | 12 | Cálculo de SLA por prioridade, `emAtraso`, `whereEmAberto` e `whereEmAtraso` |
| `jwt.strategy.spec.ts` | 11 | Sessão inválida: conta inexistente, desativada, convite pendente, token anterior à senha |
| `notificacoes.service.spec.ts` | 10 | Janela de 15 dias, idempotência, projeto concluído fora da conta |
| `dia-civil.spec.ts` | 8 | O erro de um dia, com a fórmula antiga dentro do teste como prova |
| `interacoes.service.spec.ts` | 7 | Ordem, consulta única (não N+1), `select` explícito, autor apagado |
| `permissions.guard.spec.ts` | 5 | Guard concede e nega por permissão |
| `projetos.service.spec.ts` | 5 | Filtro de `valor` por `FINANCEIRO_READ`, incluindo o caso sem usuário |
| `users.service.spec.ts` | 5 | Hash de senha, geração de convite, nível |
| `create-user.dto.spec.ts` | 5 | `@Transform` aparando nome, e-mail, telefone |
| `exigir-nivel-menor.spec.ts` | 4 | A regra de hierarquia isolada |
| `cargos.service.spec.ts` | 3 | Limpeza de permissão morta na leitura |
| `para-boolean.spec.ts` | 3 | Conversão de query string |

A cobertura é honesta: são testes de regra de negócio, não de fachada. Os
`spec` de `dia-civil` e de `projetos` são os melhores, porque provam o defeito
antigo em vez de só afirmar que ele sumiu.

### O que não tem teste nenhum e deveria

| Área | Situação | Por que dói |
|---|---|---|
| **Permissão por cargo ponta a ponta** | `permissions.guard.spec.ts` testa o guard isolado. **Nenhum teste verifica que a rota X exige a permissão Y** | Foi assim que `GET /cargos` ficou sem guarda nenhuma sem ninguém notar. Um teste de tabela rota-permissão pegaria na hora |
| **Persistência de estado** | Zero | Nenhum teste de integração toca o banco. Tudo que sei de persistência eu medi na mão |
| **Alerta de compliance chegando ao humano** | O cron é testado, a entrega não existe | Não há o que testar hoje, e é justamente o problema |
| **Todo o front** | Zero, e nem há executor | 100% da rede de segurança está na API. Toda a lógica de urgência, agrupamento, filtro e formatação de data mora na web e não tem um teste |
| **`e2e-spec.ts`** | Existe em `test/`, mas o `jest` do `package.json` tem `rootDir: src` e só roda `*.spec.ts` de lá. O e2e **não roda** no `npm test` | Passa a impressão de que existe teste de ponta a ponta |

### Rotas de API que nenhuma tela chama

70 rotas ao todo. Refiz a varredura com padrão tolerante a quebra de linha e
conferi na mão, porque a varredura automática produziu 3 falsos positivos
(`/tickets`, `/leads` e `/visitas/consultores` são usados). **12 sem tela:**

| Rota | Situação |
|---|---|
| `DELETE /empresas/:id` | Exposta, sem tela. Faz soft delete |
| `DELETE /tarefas/:id` | Idem |
| `DELETE /tickets/:id` | Idem |
| `GET /cargos/:id` | Inofensiva, mas **sem `@RequirePermissao`** |
| `GET /competencias/:id` | Inofensiva, a lista já traz o dado |
| `GET /leads/:id` | Módulo fora do menu |
| `GET /tarefas/:id` | Inofensiva |
| `GET /tickets/:id` | Inofensiva |
| `GET /visitas/:id` | Inofensiva |
| `GET /projetos/:id/etapas` | As etapas vêm dentro de `GET /projetos/:id` |
| `POST /leads/:id/converter` | Espera decisão de produto |
| `POST /notificacoes/executar-agora` | Gatilho de operação. **Protegido só por `NOTIFICACOES_READ`**, ou seja, qualquer cargo dispara o cron. Medido: Analista recebe 201 |

O número 12 do relatório está correto.

### Código morto e duplicação

- **Componente órfão: nenhum.** Varri `web/src/components` inteiro; todo arquivo
  é importado em algum lugar.
- **Mesma lógica em dois lugares:** formatação de moeda está escrita à mão em
  `dashboard/page.tsx:24` e em `projetos/[id]/page.tsx:74`, enquanto todo o
  resto do sistema centraliza formatação em `lib/formato.ts`. É a mesma classe
  de duplicação que fez o card "Tickets abertos" discordar da lista, e que a
  sessão 1 consertou criando `whereEmAberto()`. A lição não foi aplicada aqui.
- **Permissões mortas no banco de produção:** `CONSULTORES_READ` e
  `CONSULTORES_WRITE` continuam gravadas nas linhas de Analista, Coordenador e
  Desenvolvedor. A API limpa na leitura, então não quebra nada, mas o dado
  continua sujo até o primeiro save de cada cargo.

### Hex solto, data na mão, `?limit=` fixo, travessão

| Procura | Resultado |
|---|---|
| Hex solto em `.tsx`/`.ts` | **Nenhum.** Só tokens do Tailwind |
| Data formatada na mão | `formatarDataCivil`, `formatarData` e `formatarDataHora` centralizam. `AgendaCalendar` e `agendaUtils` chamam `toLocaleDateString`/`toLocaleTimeString` **sem `timeZone`**, apoiados no relógio do navegador. `dataPorExtenso` é montado à mão de propósito, para não quebrar a hidratação, e está comentado |
| `?limit=` fixo | **Um restou:** `KanbanBoard.tsx:40`, `LIMITE_BOARD = 100`. Documentado no próprio arquivo como pendência, e a tela está fora do menu |
| Travessão em texto de interface | **Nenhum.** As 25 ocorrências de `—` na web estão todas em comentário de código, nenhuma em string visível |

### Uma coisa que não é bug mas é dívida de dado

`CreateEmpresaDto` valida CNPJ com `@IsOptional() @IsString()`. Sem formato,
sem dígito verificador, sem unicidade, sem `@Transform` para aparar espaço (o
DTO de usuário tem, o de empresa não). Na tela ele aparece cru:
`12345678000190`. Num CRM de compliance, o CNPJ é o identificador legal do
cliente, e hoje qualquer texto entra.

---

## PARTE 4: diferença entre dev e produção

### A premissa está errada, e essa é a boa notícia da noite

Você escreveu que as migrations recentes rodaram contra dev e produção ficou
para trás. **Não é o caso.** Rodei `prisma migrate status` apontado para a
produção (`ep-sweet-salad`, só leitura):

```
8 migrations found in prisma/migrations
Database schema is up to date!
```

### 1. Migrations no repositório e onde cada uma está

| # | Migration | Produção |
|---|---|---|
| 1 | `20260729025826_init` | aplicada |
| 2 | `20260729152856_fundacoes` | aplicada |
| 3 | `20260729160853_competencias_etapas_sla_notificacao_etapa` | aplicada |
| 4 | `20260731230000_tarefas` | aplicada |
| 5 | `20260803180000_cron_heartbeat` | aplicada |
| 6 | `20260804120000_fundir_consultor_em_user` | aplicada |
| 7 | `20260804180000_vincular_visita_a_projeto` | aplicada em 04/08 16:27 |
| 8 | `20260805170000_equipe_do_projeto` | aplicada em 05/08 12:36 |

**Nenhuma pendente**, nenhuma com `rolled_back_at`, nenhuma falha.

Existem mais duas em `api/prisma/migrations-preparadas/`, que **o Prisma não
lê** (não é a pasta `migrations/`). Elas não entram em deploy nenhum enquanto
não forem movidas:

| Pasta | O que muda | Tipo |
|---|---|---|
| `20260805100000_ticket_prazo_e_autor` | `Ticket.prazoResposta`, `Ticket.abertoPor` | **aditiva** |
| `20260805110000_projeto_periodo` | `Projeto.dataInicio`, `Projeto.terminoEsperado` | **aditiva** |

### 2. O que quebra se o front novo subir sem elas

**Nada.** As duas criam coluna anulável e não apagam nem renomeiam. E o código
que está na `main` hoje **não usa nenhum desses quatro campos**: eles não
existem no `schema.prisma`, não existem nos DTOs e não existem em
`web/src/types`. Front e API estão inteiramente coerentes com as 8 migrations
já aplicadas.

O único ponto de atenção é o inverso: se um dia você mover as pastas, precisa
mexer no `schema.prisma` **na mesma leva**, senão o Prisma Client fica sem
conhecer as colunas.

### 3. Sequência exata de deploy

**Hoje você não precisa de nenhuma.** A `main` está em produção, o banco está
em dia. O que segue vale para quando as duas preparadas forem ativadas.

**Antes de tudo, a regra zero.** Conte as linhas em produção e anote. O
retrato de 07/08 está aqui:

> audit_logs 163, visitas 15, tarefas 11, etapas_projeto 9, users 8,
> notificacoes 8, empresas_clientes 6 (3 excluídas), projetos 6 (1 excluído),
> tickets 5 (1 excluído), interacoes 5, cargos 4, `_EquipeDoProjeto` 8,
> leads e competencias 0.

**Passo 1. Backup, antes de qualquer coisa.**
Na pasta `api/`, no seu terminal:

```bash
npm run build && npm run backup:producao
```

Você deve ver no fim uma contagem por tabela e o nome do arquivo gerado.
Guarde esse arquivo **fora deste Mac** antes de continuar.

**Passo 2. O front, na Vercel.**
Site: `vercel.com`. Caminho: projeto **crm-doctorquality-web**, aba
**Deployments**. Não há botão a apertar: a Vercel dispara sozinha quando você
faz `git push` na `main`.

O que você deve ver: uma linha nova no topo da lista com o hash do seu commit e
a etiqueta **Ready** em verde, mais o carimbo **Production**. Se aparecer
**Error**, clique na linha e leia o log de build; nada foi para o ar.

**Passo 3. A API, no EasyPanel.**
Site: o painel do EasyPanel. Caminho: o serviço da API, aba **Deployments** (ou
**Implantações**). Botão: **Deploy** / **Implantar**.

O container roda `prisma migrate deploy && node` no boot. É aqui, e só aqui,
que migration entra em produção.

O que você deve ver: o log rolando com `Applying migration ...` para cada
pendente e depois as linhas do Nest mapeando as rotas, terminando em
`Nest application successfully started`.

**Passo 4. Conferir entre um passo e outro.**
Abra no navegador a URL da API com `/health/cron` no fim.

- `{"status":"ok","ultimaExecucao":"..."}` significa que a API subiu **e** o
  cron de compliance rodou. É o sinal verde.
- `503` com `"atrasado"` significa que a API está de pé mas o cron não rodou nas
  últimas 26h.
- Nada respondendo significa que o container não subiu. Vá ao passo 5.

Depois disso, entre no CRM e confira uma tela que use o que mudou.

### 4. O que fazer se um passo falhar no meio

**Se o build da Vercel falhar (passo 2):** nada foi ao ar, a versão anterior
continua servindo. Leia o log, corrija, e faça `git push` de novo.

**Se o container do EasyPanel não subir (passo 3):** este é o caso perigoso,
porque a API fica fora enquanto isso.

O erro real aparece **só na primeira tentativa**. A partir da segunda, o Prisma
devolve `P3009` ("migrate found failed migrations") em laço, e esse erro não
diz nada sobre a causa. **Não fique apertando Implantar.** Volte ao log da
primeira falha e leia a linha do SQL que quebrou.

Como voltar: no EasyPanel, na lista de **Deployments**, escolha a implantação
anterior e use **Redeploy** / **Rollback**. Isso devolve o código antigo. **Mas
não desfaz a migration**, porque migration não tem volta automática. Como as
duas preparadas são aditivas e criam coluna anulável, código antigo convive
com coluna nova sem quebrar. É por isso que aditiva é segura e destrutiva não é.

**Se o banco ficar num estado que você não entende:** pare. Não rode mais nada.
Você tem o backup do passo 1 e o importador
(`api/prisma/importar-backup.ts`), que exige `--destino` conferido contra a
`DATABASE_URL` e mais um `--limpar` escrito à mão. Restaurar é decisão de duas
etapas de propósito.

**Uma coisa que não tem hoje:** não existe caminho de reverter uma migration.
Se uma delas for destrutiva no futuro, o único caminho de volta é restaurar o
backup, e isso significa perder tudo que entrou depois dele.

---

## PARTE 5: segurança e dados

### Permissão dentro do JWT com validade de 7 dias

**Não está no token, e isso está certo.** O login assina só `{ sub }`. Cargo,
permissões e situação saem do banco no `validate()` da `JwtStrategy`, a cada
requisição.

Testei nos dois cenários que você perguntou, com o mesmo token na mão:

| Passo | Resultado |
|---|---|
| Analista acessa `/projetos` | 200 |
| CEO desativa o analista | 200 |
| **Mesmo token**, `/projetos` de novo | **401 "Conta desativada"** |
| CEO reativa | 200 |
| Mesmo token | 200 |

| Passo | Resultado |
|---|---|
| Analista acessa `/tarefas` (tem `TAREFAS_READ`) | 200 |
| CEO troca o cargo dele para Consultor (sem `TAREFAS_READ`) | 200 |
| **Mesmo token**, `/tarefas` | **403** |
| CEO devolve o cargo | 200 e 200 |

**Vale na hora, não no próximo login.** É a parte mais sólida do sistema. O
custo é uma consulta por requisição, e vale a pena.

### Escalada de privilégio: não achei nenhuma

| Tentativa | Resultado |
|---|---|
| Coordenador cria usuário (sem `USUARIOS_MANAGE`) | 403 |
| Analista cria usuário | 403 |
| Analista edita cargo | 403 |
| Analista apaga empresa | 403 |
| CEO desativa alguém de nível igual (100) | 403 |
| CEO edita a si mesmo por `/users/:id` | 403 |
| Qualquer rota sem token | 401 |
| Analista lê valor de contrato | `valor: null` |

O RBAC de escrita resiste. Duas frestas, as duas de leitura:

**1. `GET /cargos` e `GET /cargos/:id` não têm `@RequirePermissao`.** São as
duas únicas rotas de leitura do sistema sem guarda. Qualquer pessoa autenticada,
inclusive o Analista, lê o mapa completo de permissões da empresa. Confirmei na
tela: o Analista digita `/cargos` na barra de endereço e a página renderiza
inteira. O menu esconde, a API entrega. É a mesma "maquiagem no front" que o
próprio relatório condenou ao restringir o valor de contrato.

**2. `GET /users` continua devolvendo o telefone de todo mundo.** A sessão 1
escreveu que a tela deixou de mostrar mas a rota não fechou, e pediu sua
aprovação. Cinco dias depois, medido com o token da Coordenadora:

```
ceo@teste.com          telefone=(11) 98888-0001
consultor2@teste.com   telefone=(11) 97777-0004
consultor1@teste.com   telefone=(11) 97777-0003
```

`senhaHash` e `codigoConvite` são corretamente removidos. Só o telefone vaza.

**3. `POST /notificacoes/executar-agora` exige só `NOTIFICACOES_READ`.** Uma
permissão de leitura protegendo uma ação de escrita. Medido: Analista recebe
201 e dispara o cron.

### Contas @teste.com em produção

Seis, listadas na seção 2 deste laudo. Duas com senha ativa
(`coordenador@teste.com` como Coordenador e `analista@teste.com` como Analista),
quatro com convite pendente. O Coordenador em produção pode criar e apagar
empresa e projeto.

Os `codigoConvite` estão **em texto puro** no banco, 8 caracteres. Quem lê a
tabela `users`, ou o arquivo de backup, resgata a conta e define a senha.

### Rotas de exclusão definitiva expostas

Aqui a notícia é melhor do que parece. A extensão
`prisma-audit.extension.ts` intercepta `delete` e `deleteMany` e converte em
`update excluidoEm`, com registro em `audit_logs`, para todo model que tem o
campo. **Nenhum `DELETE` de empresa, projeto, ticket, tarefa, visita, etapa,
interação, lead ou competência apaga de verdade.**

Exclusão definitiva existe em três lugares:

| Rota | Efeito | Proteção |
|---|---|---|
| `DELETE /users/:id` | **Hard delete.** `User` não tem `excluidoEm` | `USUARIOS_MANAGE`, `exigirNivelMenor`, e recusa se a pessoa tiver tarefa ou visita vinculada, com a mensagem "desative em vez de excluir" |
| `DELETE /cargos/:id` | **Hard delete.** `Cargo` não tem `excluidoEm` | `CARGOS_MANAGE`, `exigirNivelMenor`, e recusa se houver alguém usando |
| `Notificacao` | Sem soft delete, mas também sem rota de exclusão | n/a |

**Um buraco de auditoria:** `User`, `Cargo` e `Notificacao` ficam fora da
extensão, porque ela se guia pela presença de `excluidoEm`. Efeito medido no
backup de produção: **os 163 registros de `audit_logs` não têm uma única linha
de `User` ou `Cargo`.** Criar membro, trocar cargo de alguém, conceder
`FINANCEIRO_READ`, desativar uma conta: nada disso deixa rastro. As duas
entidades mais sensíveis do sistema são as únicas sem trilha.

### Soft delete e retenção: o que acontece se alguém pedir para apagar os dados

Hoje, na prática: **nada é apagado, nunca.**

1. O registro ganha `excluidoEm` e some das consultas.
2. `audit_logs` guarda um retrato JSON completo do registro em `dadosAntes`,
   e esse retrato **não é alcançado por exclusão nenhuma**.
3. Não existe rotina de expurgo, nem prazo de retenção, nem rota de exclusão
   definitiva para dado de negócio.

Se um contato de cliente exercer o direito de exclusão, o caminho existente é
apagar a linha na mão no Neon, e ainda assim a cópia dentro de `audit_logs`
continua lá. **Não há hoje como cumprir um pedido de exclusão pela aplicação.**
Não é urgente para operar, mas é uma pendência real de LGPD para um produto
que vende conformidade.

### Backup

| Pergunta | Resposta |
|---|---|
| Existe rotina? | **Não.** Nenhum `@Cron`, nenhum agendamento, nenhuma automação. Só existe se alguém lembrar |
| Ela roda? | Rodou **uma vez**: `backup-producao-2026-08-07.json`, 275 KB, de 07/08 18h11 |
| Alguém já testou restaurar? | **Sim**, e este é o ponto forte. A sessão 6 restaurou num banco descartável e comparou com a produção, projeto a projeto e conta a conta, sem diferença. As três travas do importador foram testadas uma a uma |
| Onde está a cópia? | **Só neste Mac**, em `~/Desktop/backups-crm-doctorquality/`. Cópia única, sem redundância |
| O que tem dentro? | Dado pessoal e **hash de senha de 8 pessoas**, mais os 4 códigos de convite em texto puro. JSON sem criptografia, permissão 600 |

Resumindo: o mecanismo de backup é bom e foi provado. **A prática de backup não
existe.** O arquivo tem dois dias, é único, e mora no mesmo lugar que o resto.

### Segredo onde não deveria

| Onde | O quê |
|---|---|
| `api/.env` | **Permissão 644, legível por qualquer processo do usuário.** Contém senha do Neon e o `JWT_SECRET`. Comparar com `.env.producao`, que está corretamente em 600 |
| Repositório | Limpo. `.gitignore` cobre `.env*` e `.claude/`. Não achei segredo commitado |
| Log | Limpo. Nada de token ou senha em log |
| `audit_logs` | Limpo. Zero ocorrência de `senhaHash` nos 163 registros |
| Backup | Hash de senha e códigos de convite, como dito acima |
| `api/.env.local` | O comentário do topo afirma que "o `.env` desta pasta aponta para o Neon de PRODUÇÃO". **É falso**, aponta para `vercel-dev`. A sessão 6 corrigiu a mesma frase no `package.json` e deixou esta. É a quarta mentira de documentação da semana |

**Um detalhe operacional:** as credenciais em `api/.env` (branch `vercel-dev`,
`ep-rapid-dew`) **estão mortas**. Tentei conectar e recebi
`password authentication failed`. Ou seja, `npm run start:dev` não funciona
hoje. Não é problema de produção, mas é um comando quebrado que a documentação
apresenta como válido.

**Outro:** a URL da API em produção não está em lugar nenhum do repositório,
só na variável de ambiente da Vercel. Se aquele painel se perder, ninguém sabe
onde a API mora.

---

## PARTE 6: pronto para cliente real?

| Item | Situação | Uma frase |
|---|---|---|
| Uma pessoa que nunca viu o sistema consegue usar sozinha | **Pronto** | Os textos são claros, os estados vazios explicam o que fazer e os estágios de projeto dizem o que significam; é a parte mais bem resolvida do produto |
| O alerta de prazo de compliance chega até um humano | **Não** | Ele grava uma linha no banco e espera alguém abrir a tela; não há e-mail, push nem webhook, e prazo já vencido para de gerar alerta |
| SLA de ticket vencido avisa alguém | **Não** | `emAtraso` é calculado na hora e desenhado na tela do ticket; nenhum cron olha para SLA e nada é disparado |
| Ninguém perde acesso sem saída | **Parcial** | Desativar e trocar cargo valem na hora, e o break-glass existe; mas quem está no topo da hierarquia não consegue editar o próprio cargo nem a própria conta pela interface, e a tela de Membros oferece botões que devolvem 403 |
| Dado do cliente tem backup verificado | **Parcial** | A restauração foi testada de verdade contra a produção, e passou; mas não há rotina, o único arquivo é de 07/08 e existe em cópia única neste Mac |
| Erro na API vira mensagem, não tela branca | **Parcial** | `EstadoErro` cobre 11 telas com frase humana e botão; mas um 403 aparece como "isso costuma ser passageiro, tente de novo" e imprime `Permissão necessária: USUARIOS_READ` na tela |
| Funciona no celular | **Parcial** | Nenhuma tela estoura a largura em 390px e a agenda foi bem resolvida; mas o menu trava a tela quando a animação não roda, e a agenda tem 16 alvos de toque abaixo de 36px, alguns com 19px |
| Existe caminho para reverter um deploy ruim | **Parcial** | Código volta pelo Redeploy da Vercel e do EasyPanel; migration não tem volta, e o único caminho é restaurar um backup que hoje tem dois dias |

### O que eu faria antes de deixar um cliente entrar

Em ordem, e nenhum é grande:

1. Apagar ou desativar as seis contas `@teste.com` em produção, começando pelas
   duas com senha ativa.
2. Tirar `Novalgina Linha 9` de CONCLUÍDO, porque o prazo dele é **amanhã**.
3. Fazer o alerta de compliance sair do banco. Um e-mail diário já resolve, e o
   Resend já estava no caminho.
4. Passar a alertar prazo vencido, não só prazo por vencer.
5. Consertar a gaveta do celular: trocar a animação de `opacity` por `transform`
   na `Sidebar`, como já foi feito no `Modal`.
6. Fazer a mensagem do alerta guardar o fato e a tela calcular os dias.
7. Dar dono à notificação, ou pelo menos registrar quem marcou como lida.
8. Pôr `@RequirePermissao('CARGOS_MANAGE')` no `GET /cargos`.
9. Consertar o typecheck da api e pôr `npm run typecheck` junto do lint.
10. Agendar o backup e mandar uma cópia para fora deste Mac.

---

## Anexo: o que esta sessão mexeu

Nada de código, nada de commit, nada de migration, nada em produção.

**No banco local `crm_dq_local`**, para testar persistência:
- Ticket "Desvio na temperatura da câmara fria": status `ABERTO` para `EM_ANDAMENTO`.
- Tarefa "Agendar treinamento com a equipe": `PENDENTE` para `CONCLUIDA`.
- Uma notificação marcada como lida.
- Analista desativado e reativado, cargo trocado e devolvido (terminou como estava).

**Fora do repositório:**
- `/Users/nicolas/package-lock.json` movido e **devolvido** ao fim da sessão.
- `web/.next` apagado (artefato de build, se refaz sozinho).
- O dev server da landing page `jp-odontologia` foi encerrado para liberar a
  porta 3000, com o seu aval. Para religar: `npm run dev` na pasta dela.
