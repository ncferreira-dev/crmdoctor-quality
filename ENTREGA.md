# ENTREGA

Fila única do programa de entrega do CRM Doctor Quality.

**Este arquivo é a fonte de verdade. Nenhuma outra lista de tarefas existe.**
Fila numerada em prompt antigo, relatório de sessão e checkup são histórico, não
regra. Quem pega uma sessão pega o próximo item aberto daqui e atualiza este
arquivo ao terminar.

Precedência e paradas obrigatórias estão no topo do `CLAUDE.md`.

Como um item fecha: o critério de pronto precisa ter sido **medido**, não
afirmado. Quando houver comando, o comando é a prova. Correção de defeito de
padrão (formatação, animação, validação, duplicação de lógica, guarda de rota)
só fecha com varredura provando que sobrou zero, que é o que o
`npm run entrega:check` faz.

---

## Marco zero, 09/08/2026

Primeira execução do verificador, antes de qualquer conserto.

```
npm run entrega:check
8 de 32 checagens passaram.  (saída: código 1)
```

| Passando | Falhando |
|---|---|
| api: lint sem `--fix` | api: typecheck |
| api: testes (12 suítes, 78 testes) | web: testes (não existe executor) |
| web: typecheck | api: e2e alcançado por algum comando |
| web: lint | notificação tem destinatário ou tabela de leitura |
| nenhum `type="date"` solto | janela do cron inclui prazo vencido |
| nenhum hex solto no JSX | mensagem guarda o fato, não o número de dias |
| nenhum travessão em texto de interface | existe motor de envio de e-mail |
| nenhum `eslint-disable` sobrando | toda rota autenticada tem `@RequirePermissao` |
| | `executar-agora` não fica atrás de permissão de leitura |
| | telefone não sai de `GET /users` para quem não gerencia |
| | nenhum `datetime-local` fora do componente de data |
| | nenhum limit fixo fora do paginador |
| | formatação de moeda só em `lib/formato.ts` |
| | nenhuma animação decide se algo é visível |
| | `ValidationPipe` recusa campo fora do DTO |
| | raiz do Turbopack fixada |
| | GET não manda `Content-Type` à toa |
| | CNPJ tem validação de formato |
| | gaveta do celular fecha com Esc |
| | responsável do marco preenchível em tela |
| | bloco Equipe aparece mesmo vazio, com ação |
| | código de convite não fica em texto puro |
| | auditoria alcança User e Cargo |
| | endereço da API de produção está no repositório |

Mais 11 itens de conferência humana, impressos no fim da saída do verificador.

Duas leituras que valem a pena tirar deste retrato:

- **A saúde de compilação já estava mentindo.** `npm run lint` da api roda com
  `--fix` e por isso sempre sai verde, e `nest build` exclui os `*.spec.ts`, o
  que escondeu que `tsc --noEmit` falha desde a limpeza de 07/08. O verificador
  chama `eslint` sem `--fix` e `tsc` direto, e é por isso que o número mudou.
- **Nenhuma checagem do Bloco 1 passa.** A promessa do produto tem zero
  cobertura hoje.

---

## Legenda

- **Estado:** `aberto`, `em curso`, `feito`, `de fora` (decisão de não fazer)
- **Depende de:** número do item que precisa estar `feito` antes
- Item marcado com **(parada)** exige avisar em uma linha e esperar "vai",
  conforme o `CLAUDE.md`

---

# BLOCO 1: a promessa do produto

O bloco que decide se o sistema tem motivo para existir. Enquanto ele não
fechar, o CRM entrega três vantagens de infraestrutura e nenhuma vantagem de
operação: o alerta de prazo, que é a única coisa que planilha e WhatsApp não
fazem de jeito nenhum, nasce e morre dentro do banco.

### 1. Notificação passa a ser aviso de uma pessoa

**Bloco:** 1 · **Depende de:** nada · **Estado:** **feito em 09/08/2026**

> **Como ficou, e como foi medido.**
>
> Migrations `20260810003447_notificacao_por_pessoa` (só `CREATE TABLE`,
> `CREATE INDEX` e `ADD CONSTRAINT`, nenhum `ALTER` nos dois índices únicos de
> `notificacoes`) e `20260810004053_limpar_contagem_congelada_das_mensagens`
> (tira a contagem de dias das mensagens gravadas antes, para elas não
> aparecerem com o número duas vezes).
>
> Uma tabela só, `notificacao_destinatarios`, responde as duas perguntas: uma
> linha significa "este alerta é seu" e, com `lidaEm` preenchido, "você deu
> baixa às tantas horas". Duas tabelas separadas permitiriam o estado absurdo
> de leitura sem destinatário.
>
> A regra de destinatário vive num lugar só, em `sincronizarDestinatarios`:
> marco vai para o responsável; sem responsável, para a equipe do projeto; sem
> equipe, para todo mundo ativo com `PROJETOS_READ`. O último recurso existe
> para nenhum prazo ficar sem dono, e o caminho para sair dele é preencher
> equipe e responsável (itens 30 e 31). A reconciliação roda a cada execução
> sobre a janela inteira, com `skipDuplicates`, então quem entra na equipe hoje
> passa a receber o alerta criado semana passada.
>
> Medido contra a API local, com três contas:
>
> | O que testei | Resultado |
> |---|---|
> | Alerta para prazo já vencido | **3 alertas novos** que antes não existiam: 01/08, 03/08 e 07/08 |
> | Cada pessoa vê a sua lista | CEO 2, Coordenadora 3, Juliana 1 |
> | Regra do responsável | o marco de 03/08 foi só para Juliana, que é a responsável, e não para a equipe |
> | Regra do último recurso | o projeto sem equipe gerou 4 destinatários, os 4 com `PROJETOS_READ` |
> | CEO dá baixa | CEO cai de 2 para 1 e **a Coordenadora continua com 3**, ainda vendo o mesmo alerta |
> | Quem não é destinatário tenta dar baixa | 404, porque para ela o alerta não existe |
> | Contador do dashboard | CEO 1, Coordenadora 3, cada um o seu |
> | Contradição entre telas | acabou: o painel diz "Vencido há 2 dias · 07/08/2026", calculado na hora |
>
> `npm run entrega:check` passou de 8 para 11 checagens, com as três do Bloco 1
> que dependiam deste item: destinatário, janela com vencido, e mensagem sem
> contagem.
>
> **Duas coisas que apareceram no caminho e valem registro.** A primeira: o
> verificador tinha dois falsos negativos meus, e um era grave, porque achava
> `gte: hoje` dentro de um comentário e acusava falha depois do defeito
> corrigido. Os dois foram consertados, e a busca passou a ignorar comentário.
> A segunda: eu havia corrigido de passagem o guard de `executar-agora`, que é
> o item 15. Revertido de propósito, porque ele depende do item 12 e o teste
> precisa nascer falhando nesse caso.

Refazer o módulo. Os quatro defeitos conhecidos (sem destinatário, leitura
compartilhada, número de dias congelado no texto, prazo vencido fora da janela)
são sintoma de uma decisão só: `Notificacao` foi modelada como aviso da empresa.
Consertar um a um é retrabalho garantido.

O que muda:

- **Destinatário por regra explícita.** A regra fica escrita num lugar só e
  documentada: quem recebe o aviso de um projeto, quem recebe o de um marco.
- **Leitura por pessoa.** Desenho preferido: a notificação continua sendo uma
  linha e nasce uma tabela de leitura (notificação mais pessoa mais quando).
  É aditivo e **não mexe nos dois índices únicos existentes**
  (`[projetoId, tipo, dataReferencia]` e `[etapaId, tipo, dataReferencia]`). O
  desenho alternativo, uma linha por pessoa, obrigaria a derrubar e recriar os
  dois índices, o que não perde dado mas deixa de ser aditivo.
- **Mensagem guarda o fato.** O texto para de conter "vence em N dias". A tela
  calcula a partir de `dataReferencia`, que já está gravada.
- **Janela inclui o vencido.** Sai o `gte: hoje`. Prazo que passou continua
  cobrando, que é quando mais importa.
- **Registro de quem deu baixa.** A tabela de leitura já responde isso.

**Critério de pronto:** `npm run entrega:check` passa em "notificação tem
destinatário ou tabela de leitura", "janela do cron inclui prazo vencido" e
"mensagem guarda o fato, não o número de dias". Além disso, medido contra a API
local: dois usuários diferentes com o mesmo alerta, um marca como lido e o outro
continua vendo; e um projeto com prazo em data passada aparece na lista de
alertas.

### 2. Motor de envio de e-mail

**Bloco:** 1 · **Depende de:** nada · **Estado:** **construído, esperando a chave**

Instalar e ligar o provedor de e-mail transacional (Resend é o escolhido no
contexto). Provar o envio com o domínio de teste do provedor, que entrega sem
depender de DNS.

**Critério de pronto:** `npm run entrega:check` passa em "existe motor de envio
de e-mail", e um e-mail disparado pela API local **chega numa caixa de entrada
de verdade**, com o print ou o id da mensagem registrado aqui. API respondendo
200 não conta como prova.

> **Feito em 09/08/2026, e o que falta.**
>
> Código pronto: `resend` instalado, `EmailModule` global, `EmailService` com o
> contrato `enviar()`, e o script `npm run email:teste -- alguem@exemplo.com`,
> que sobe só ConfigModule e EmailModule, chama o mesmo serviço que o cron vai
> chamar e imprime o id que o provedor devolveu. Seis testes novos, 94 no total.
>
> A decisão que guiou o desenho: **nada aqui falha em silêncio.** Sem chave, o
> motor sobe DESLIGADO e grita no boot em vez de derrubar a API, e cada envio
> que não acontece é registrado com o destinatário e o assunto, não com um
> "pulei" genérico. E o SDK do Resend **não lança** em domínio não verificado,
> chave inválida ou destinatário recusado: devolve `{ error }` no corpo. Tratar
> só o `catch` faria os três passarem por sucesso, que é a pior versão da falha
> silenciosa: o sistema acreditando que avisou. Tem teste para esse caso.
>
> **A checagem automática já passa. O critério NÃO está cumprido**, e o que
> falta não é código: falta a `RESEND_API_KEY`, que só o Nícolas pode gerar. O
> passo a passo está em `CHAVES-PENDENTES.md`. Enquanto isso, rodar o script
> devolve, corretamente, "O motor está desligado".
>
> Quando a chave chegar, o item fecha com o id da mensagem e a confirmação de
> que ela apareceu na caixa de entrada, anotados aqui.

### 3. Disparo diário por destinatário

**Bloco:** 1 · **Depende de:** 1 e 2 · **Estado:** **feito em 10/08/2026, com a
entrega dependendo da chave**

> **O alerta saiu do banco pela primeira vez.** Até aqui o motor de e-mail
> existia e ninguém o chamava: o item 2 provou que dá para enviar, e este é o
> item que resolve enviar.
>
> **As três seções são mutuamente exclusivas, e essa é a decisão que mais
> importa.** Um alerta que aparecesse em duas seções ensinaria a pessoa a ler o
> e-mail na diagonal, que é o ruído que o item existe para não criar:
>
> | Seção | O que entra |
> |---|---|
> | Já venceu | prazo já passou, não importa quando o alerta nasceu |
> | Vence | prazo ainda não chegou e o alerta nasceu hoje |
> | Em aberto desde ontem | prazo ainda não chegou e o alerta já existia ontem |
>
> A contagem de dias é feita na hora do envio, nunca lida do banco. É a mesma
> regra do item 1, e agora vale nos três lugares que falam de prazo: a tela, o
> sino e o e-mail.
>
> **Medido contra o banco local, com `npm run resumo:teste`:**
>
> ```
> pessoas com alerta pendente: 6
> e-mails montados:            6
> pessoas sem nada:            1   (não recebem e-mail)
> ```
>
> Cada e-mail levou só o que é da pessoa, conferido um por um. Três amostras:
>
> | Quem | Assunto | Conteúdo |
> |---|---|---|
> | Renata (Coordenadora) | 2 vencido(s) e 1 a vencer | Plano de ação venceu há 3 dias, Registro dermocosmético venceu há 2, BPF vence em 6 |
> | Marcos (Consultor) | 1 a vencer | Treinamento da equipe, vence em 3 dias |
> | Diego (Analista) | 1 vencido e 2 a vencer | Qualificação de transporte venceu há 9 dias, mais duas |
>
> Renata não recebeu nada do Marcos, e vice-versa. A sétima pessoa apta não
> recebeu e-mail nenhum, que é o critério de "quem não tem nada não recebe".
>
> **A trava de um por dia, medida contra a tabela de verdade:**
>
> | Rodada | O que aconteceu |
> |---|---|
> | motor desligado, 6 destinatários | 0 enviados, 6 falhas, **o dia NÃO foi carimbado** |
> | com o carimbo do dia no lugar | "já saiu hoje", 0 disparos |
>
> As duas linhas são de propósito. O cron roda no boot do container, então sem
> a trava três deploys numa terça seriam três e-mails iguais para todo mundo. E
> o dia só é carimbado se pelo menos um e-mail saiu: carimbar uma rodada em que
> tudo falhou trocaria o problema por silêncio até o dia seguinte. Falha
> parcial carimba, senão quem já recebeu receberia de novo.
>
> 12 testes novos (6 do conteúdo, 6 do disparo), incluindo o escape de HTML:
> nome de projeto é texto digitado por gente e vai para dentro de uma tag.
>
> Checagem nova no verificador, a de número 40: "o alerta sai do banco, cron
> dispara aviso por pessoa". Ela cobra o LAÇO e não a biblioteca, porque ter
> motor não é avisar ninguém, e foi exatamente esse o estado entre os itens 2 e
> 3.
>
> **O que este item NÃO prova, e é honesto dizer:** que o e-mail chega. Sem a
> `RESEND_API_KEY` o motor sobe desligado e a medição vai até a fronteira do
> envio, não até a caixa de entrada. A prova de entrega é do item 5, e o passo
> a passo da chave está em `CHAVES-PENDENTES.md`. O dia em que a chave entrar,
> este disparo já está pronto e nada precisa mudar aqui.

Um e-mail por pessoa, por dia, com três seções: o que vence, o que já venceu, e
o que ficou em aberto desde ontem. Quem não tem nada não recebe e-mail, para o
aviso não virar ruído que se aprende a ignorar.

**Critério de pronto:** rodando o disparo contra o banco local com dois
destinatários diferentes, cada um recebe um e-mail com o seu conteúdo, e o
terceiro usuário, sem nada pendente, não recebe nada. Registrar aqui as três
contagens.

### 4. SLA de ticket vencido entra no mesmo disparo

**Bloco:** 1 · **Depende de:** 3 · **Estado:** **feito em 10/08/2026**

> **Quarta seção do mesmo e-mail, e não um e-mail novo.** Duas mensagens por dia
> seria a mesma pessoa aprendendo a ignorar as duas.
>
> **O chamado NÃO vira linha em `notificacoes`, e isso é decisão.** Aquela
> tabela guarda fato datado com baixa por pessoa. SLA estourado não é fato de um
> dia: é um estado que dura até alguém responder. Persistir criaria um alerta
> que precisa ser "lido" enquanto o chamado segue sem resposta. Do jeito que
> ficou, a seção some sozinha quando a primeira resposta é registrada, e isso
> foi medido.
>
> **Destinatário segue a MESMA escada da regra de prazo**, que já existia neste
> código: quem registrou o chamado, se ainda estiver apto; senão todo mundo que
> consegue responder, que é quem tem `TICKETS_WRITE`. Ticket não tem responsável
> no modelo; no dia em que tiver, ele vira o primeiro degrau.
>
> **Medido contra o banco local, com um chamado criado para o teste e apagado
> depois** (`npm run resumo:teste`):
>
> | Momento | Marcos (registrou) | Os outros 5 |
> |---|---|---|
> | antes do chamado de teste | nenhum chamado | 2 chamados (os que já existiam) |
> | com o chamado aberto há 30h, prioridade alta | **1 chamado: o dele** | continuam com 2, sem o dele |
> | depois de registrar a primeira resposta | volta a nenhum | continuam com 2 |
>
> A linha que ele recebeu: "TESTE ITEM 4, da empresa Laboratório Vitalis
> (prioridade alta, 28h além do prazo)". As horas são contadas na hora do envio,
> pela mesma régua de `tickets.utils.ts`.
>
> Os dois chamados que já existiam caíram para os 4 cargos com `TICKETS_WRITE`,
> que é a escada funcionando: eles não têm quem registrou apto, e mesmo assim
> não sumiram do radar.
>
> Contagem de tickets no banco local antes e depois: 4 e 4. O chamado de teste
> foi apagado.
>
> 4 testes novos, incluindo o caso de quem registrou ter saído da empresa.
>
> **Duas réguas no mesmo e-mail, de propósito:** prazo de compliance é contado
> em dias civis, SLA de chamado é contado em horas. Misturar as duas é como este
> sistema já errou um dia inteiro antes.

O prazo de primeira resposta já é calculado (`tickets.utils.ts`: alta 2h, média
8h, baixa 24h) e hoje só existe como selo na tela. Entra como quarta seção do
e-mail diário.

**Critério de pronto:** um ticket sem primeira resposta e fora do prazo aparece
no e-mail do destinatário certo. Medido com um ticket criado para o teste e
apagado depois.

### 5. Verificação do domínio no provedor

**Bloco:** 1 · **Depende de:** nada · **Estado:** aberto, **tarefa do Nícolas**

Não bloqueia os itens 1 a 4, que se provam com o domínio de teste. Bloqueia o
envio para a equipe de verdade.

**Critério de pronto:** um e-mail enviado de um endereço `@doctorquality.com.br`
chega sem cair em spam. O passo a passo de onde clicar vai para
`CHAVES-PENDENTES.md` quando o item 2 começar.

---

# BLOCO 2: produção deixa de ser laboratório

**Nesta ordem, e a ordem importa.** A auditoria vem antes da limpeza de contas
porque limpar conta sem rastro é exatamente o tipo de operação que não se
consegue reconstruir depois.

### 6. Auditoria alcança User e Cargo

**Bloco:** 2 · **Depende de:** nada · **Estado:** **feito em 09/08/2026**

> **Como ficou, e como foi medido.** Sem migration: é só código.
>
> Soft delete e auditoria eram a mesma coisa por acidente. A extensão do Prisma
> decidia tudo por um portão só, `!MODELOS_COM_SOFT_DELETE.has(model)`, e quem
> não tinha `excluidoEm` saía dali antes de qualquer coisa, perdendo os dois de
> uma vez. Agora são conjuntos independentes: `MODELOS_COM_SOFT_DELETE` decide
> a exclusão reversível e o filtro de leitura, `MODELOS_COM_AUTORIA` decide
> quem recebe `criadoPorId` (User e Cargo não têm essa coluna, e escrever nela
> estouraria o insert), e `FORA_DA_TRILHA` decide quem não é auditado.
>
> **A lista é de exceções, não de incluídos, e isso é a parte que evita a
> próxima vez.** Com allowlist, todo model novo nasce fora da trilha e ninguém
> percebe, que é exatamente como User e Cargo ficaram de fora. Com denylist, o
> padrão é auditar e deixar algo de fora exige escrever o motivo ali. Ficaram
> de fora quatro: `AuditLog` (laço infinito), `CronExecucao` (carimbo diário),
> `Notificacao` e `NotificacaoDestinatario` (nascem em lote todo dia pelo cron).
>
> **O que quase entrou junto, e não podia.** A trilha guarda um retrato
> completo da linha. Com User dentro dela, `senhaHash` e `codigoConvite`
> passariam a ser gravados em `audit_logs`, uma tabela que ninguém trata como
> sensível e que vai inteira para o arquivo de backup. Nasceu
> `CAMPOS_QUE_NUNCA_ENTRAM`, aplicada antes da serialização para nenhum caminho
> de escrita conseguir pular. Ela substitui por `[oculto]` em vez de omitir, senão
> "não tinha código de convite" e "tinha e eu escondi" viram o mesmo retrato.
> Cinco testes só para essa função.
>
> Medido contra a API local, logado como CEO:
>
> | O que testei | Antes | Agora |
> |---|---|---|
> | Linhas de auditoria de User e Cargo | **0** | criar membro, trocar cargo dele e desativar geram **3 linhas**, com "Fabrício Teste" como quem fez |
> | Editar um cargo | nada | 1 linha de UPDATE em Cargo |
> | Credencial dentro do retrato | n/a | `senhaHash` e `codigoConvite` gravados como `[oculto]`, e **zero** linhas com hash argon2 ou código de 8 dígitos na tabela inteira |
> | Excluir membro | sem rastro | exclusão continua definitiva (User não tem `excluidoEm`) e agora **fica registrada**: a trilha passou a ser o único lugar onde consta que aquela conta existiu |
>
> Duas regressões que eu esperava e conferi que não aconteceram: soft delete
> continua soft (apagar empresa mantém as 4 linhas na tabela e só carimba
> `excluidoEm`), e a leitura de User segue passando intacta pela extensão, o que
> importa porque o `JwtStrategy` faz `findUnique` em User a **cada request
> autenticada** e converter isso em `findFirst` custaria o índice único.
>
> 99 testes, 14 suítes. `npm run entrega:check` foi de 12 para 14, e ganhou uma
> checagem nova, "auditoria não copia credencial para dentro do log", que não
> existia antes porque o risco não existia antes.

Hoje a extensão do Prisma decide o que auditar pela presença de `excluidoEm`.
`User`, `Cargo` e `Notificacao` não têm esse campo e ficam de fora. Medido no
backup de produção: dos 163 registros de auditoria, **zero** são de User ou
Cargo. Criar conta, trocar o cargo de alguém, conceder acesso ao valor de
contrato e desativar membro não deixam rastro nenhum.

Desacoplar auditoria de soft delete: são duas coisas diferentes que hoje
compartilham o mesmo gatilho.

**Critério de pronto:** `npm run entrega:check` passa em "auditoria alcança User
e Cargo". E, contra o banco local: criar um usuário, trocar o cargo dele e
desativá-lo gera três linhas em `audit_logs` com o `usuarioId` de quem fez.

### 7. Código de convite deixa de ficar em texto puro

**Bloco:** 2 · **Depende de:** 6 · **Estado:** **feito em 09/08/2026**

> **Como ficou.** A coluna `codigoConvite` (8 dígitos em claro, com índice
> único) virou `codigoConviteHash`, com argon2, o mesmo algoritmo do
> `senhaHash`.
>
> **O que isso obrigou, e é a parte que muda a tela.** argon2 é salgado, então
> o mesmo código gera hashes diferentes e **não existe busca pelo hash**. O
> resgate passou a pedir **e-mail mais código**: o e-mail acha a linha, o
> argon2 confere o código. Ganho colateral que não era o objetivo: antes
> qualquer pessoa podia varrer o espaço de 8 dígitos sem saber o e-mail de
> ninguém, porque a busca era direto pelo código.
>
> A mensagem de erro é a mesma para e-mail inexistente, conta desativada e
> código errado. Respostas diferentes transformariam esta rota pública num
> confirmador de quem tem conta aqui.
>
> **Migration `20260810011500_convite_guardado_como_hash`, e ela é
> DESTRUTIVA.** Não dá para converter os códigos existentes, porque hash se
> calcula em código e não em SQL. Então todo convite pendente é invalidado, e
> quem não fez o primeiro acesso precisa de um código novo pela tela de
> Membros. Em produção isso atinge 4 contas, todas `@teste.com`, todas com
> convite que ninguém resgatou em 5 dias, e todas na fila do item 8 para serem
> desativadas. Nenhuma conta com senha já definida é afetada. **No deploy isso
> é parada obrigatória:** backup e "vai" antes.
>
> Medido de ponta a ponta contra a API local:
>
> | O que testei | Resultado |
> |---|---|
> | Cadastrar membro | código devolvido uma vez na resposta, e **nenhuma linha da tabela contém o código em claro** |
> | O que fica no banco | `$argon2id$v=19$m=65536,p=4,t=3$...` |
> | Login antes do resgate | 401, "primeiro acesso pendente" |
> | Resgate sem e-mail | 400, "Informe o e-mail do seu cadastro" |
> | Código errado / e-mail inexistente | **a mesma** mensagem, 404 |
> | Resgate correto | senha definida, hash do convite apagado, login com a senha nova em 201 |
> | Resgatar de novo com o mesmo código | 404: é de uso único |
> | Resetar senha pela tela | código novo em hash, e a senha antiga para de valer na hora |
> | Força bruta no resgate | 429 depois de 5 tentativas por minuto |
>
> Junto vieram três coisas menores: `aparar` saiu de dentro do `CreateUserDto`
> e virou `common/transforms/aparar.ts`, usado pelos dois DTOs (o e-mail
> colado com espaço faria o resgate recusar um código correto); os scripts
> `criar-usuario-inicial.ts` e `resetar-acesso.ts` passaram a gravar o hash; e
> `codigoConviteHash` entrou na lista de campos que nunca entram no audit log.
>
> **Um defeito do próprio verificador, achado aqui e consertado.** A checagem
> "telefone não sai de GET /users" ficou **verde sozinha** quando renomeei o
> campo, porque ela procurava o texto exato da desestruturação. Medi na hora:
> a Coordenadora continuava recebendo 3 telefones que não eram dela. A
> checagem passou a procurar a regra (`USUARIOS_MANAGE` no service) em vez do
> formato, e voltou a falhar, como deve, até o item 14. Verificador que fica
> verde por renomeação é pior que verificador nenhum.
>
> 102 testes, 14 suítes. `npm run entrega:check` foi de 14 para 15.

O código de 8 dígitos é gravado em claro na coluna `codigoConvite` e viaja assim
para dentro do arquivo de backup. Quem lê a tabela ou o arquivo resgata a conta
e define a senha. Hoje há 4 códigos ativos em produção.

Guardar o hash, comparar no resgate, e o código em claro existir só no instante
em que é exibido para quem cadastrou.

**Critério de pronto:** `npm run entrega:check` passa em "código de convite não
fica em texto puro". E o fluxo de primeiro acesso continua funcionando de ponta
a ponta no banco local: cadastra, copia o código, define a senha, entra.

### 8. Contas @teste.com saem do ar **(parada)**

**Bloco:** 2 · **Depende de:** 6 e 7 · **Estado:** **metade feita em 10/08/2026.
Segue aberto: faltam 3 contas que são de pessoas de verdade**

> **Três contas desativadas na produção, com rastro.** A medição mudou o plano
> do item, e ela veio antes de qualquer escrita: contando o trabalho vinculado a
> cada conta `@teste.com`, as seis se partiram em dois grupos que não têm nada a
> ver um com o outro.
>
> | Conta | Tarefas | Marcos | Visitas | Equipes | O que foi feito |
> |---|---|---|---|---|---|
> | `analista@teste.com` | 0 | 0 | 0 | 0 | **desativada** |
> | `joao@teste.com` | 0 | 0 | 0 | 0 | **desativada** |
> | `coordenador@teste.com` | 2 | 2 | 1 | 3 | **desativada** |
> | `analista2@teste.com` (Giovanna) | 4 | 2 | 4 | 1 | fica, é pessoa |
> | `analista3@teste.com` (Erica) | 2 | 2 | 3 | 2 | fica, é pessoa |
> | `analista4@teste.com` (Aline) | 3 | 2 | 7 | 2 | fica, é pessoa |
>
> As três de baixo têm 9 tarefas, 6 marcos e 14 visitas atribuídas entre elas.
> Isso não é conta de teste com nome de gente: é gente com e-mail provisório. O
> caminho para elas não é desativar, é **trocar o e-mail**, e aí saem desta lista
> sozinhas. Continua dependendo da conversa com o Fabrício, como o próprio item
> já dizia.
>
> A `coordenador@teste.com` entrou mesmo tendo trabalho vinculado, porque é a
> que apaga empresa e projeto de cliente real. Desativar não solta o trabalho:
> tarefa, marco e visita seguem atribuídos a ela.
>
> **Medido, antes e depois:** 8 contas ativas viraram 5, e as três somem da lista
> de ativas. Nada foi excluído.
>
> **A trilha de auditoria tem 9 linhas, e as 3 primeiras são um erro meu.**
>
> ```
> 22:25 | autor: (SEM AUTOR) | analista@teste.com     | ativo: true -> false
> 22:25 | autor: (SEM AUTOR) | joao@teste.com         | ativo: true -> false
> 22:25 | autor: (SEM AUTOR) | coordenador@teste.com  | ativo: true -> false
> 22:29 | autor: nícolas     | (as três)              | ativo: false -> true
> 22:29 | autor: nícolas     | (as três)              | ativo: true -> false
> ```
>
> O script chamava `runWith(store, () => prisma.user.update(...))`. A
> `PrismaPromise` é **preguiçosa**: a promessa nasce dentro do contexto e
> executa fora dele, porque o `await` só acontece depois que o `runWith` já
> voltou. A extensão então lia contexto vazio e gravava `usuarioId` nulo, **sem
> erro nenhum**, que é o pior jeito de errar. O conserto é o `await` dentro do
> callback.
>
> Como auditoria não se reescreve, a correção foi reativar e desativar de novo,
> com autor. As seis linhas novas contam a história inteira, inclusive o erro, e
> é assim que tem que ser.
>
> **A rota da aplicação NÃO tinha esse defeito**, e isso foi conferido em vez de
> suposto: as 163 linhas de auditoria anteriores, todas vindas de requisição
> HTTP, têm autor. O interceptor envolve o `next.handle()`, e a assinatura do
> RxJS acontece dentro do contexto.
>
> Nasceu `prisma/desativar-contas.ts` (`npm run contas:desativar:producao`), com
> quatro travas: `--destino` conferido contra a `DATABASE_URL`, `--como`
> obrigatório para a linha de auditoria ter dono, só e-mail `@teste.com`, e
> ensaio por padrão. Ele também reativa (`--reativar`), que é como esta correção
> foi feita.
>
> **As três contas de pessoas ficam, por decisão do Nícolas em 10/08/2026.**
> Ele optou por não mexer nelas, e o item para de cobrar isso. Fica registrado o
> que essa decisão custa, para ninguém redescobrir depois:
>
> O endereço `@teste.com` **não existe**. No dia em que a `RESEND_API_KEY`
> entrar, o aviso diário da Giovanna, da Erica e da Aline vai ser enviado para
> `analista2/3/4@teste.com` e não vai chegar em ninguém. Elas têm 3, 2 e 1
> alerta pendentes hoje. De cinco contas ativas na produção, **três não
> conseguem receber aviso nenhum**, que é a promessa do produto falhando calada
> para a maioria da equipe.
>
> O conserto, quando for a hora, é uma troca de e-mail, não uma desativação. Com
> os endereços reais em mãos isso é um comando, e fecha junto com o item 29, que
> é sobre os mesmos nomes ("Giovanna " e "Erica " ainda têm espaço sobrando).
>
> O critério original do item ("nenhuma conta `@teste.com` aparece como ativa")
> segue **não cumprido**, e por escolha, não por esquecimento.
>
> **"Depois a gente apaga" não é um caminho disponível para estas três**, e vale
> saber antes de contar com ele. A API recusa: "Este membro é responsável por
> tarefas, etapas ou visitas. Reatribua esse trabalho ou apenas desative o
> membro." São 9 tarefas, 6 marcos e 14 visitas somadas. Excluir levaria esse
> histórico junto, e em compliance o histórico é o produto. As duas saídas reais
> são trocar o e-mail (um comando, mantém tudo) ou reatribuir o trabalho para
> outra pessoa antes de excluir (mais caro, e o histórico passa a ter o nome de
> quem não fez).

Seis das oito contas de produção são `@teste.com`. Duas entram agora
(`coordenador@teste.com` e `analista@teste.com`), e a de Coordenador tem
`EMPRESAS_WRITE` e `PROJETOS_WRITE`, ou seja, apaga empresa e projeto de cliente
real. As outras quatro têm convite pendente.

Desativar, não excluir: em compliance a regra é desativar, e três delas
(Giovanna, Erica, Aline) provavelmente são pessoas de verdade cadastradas com
e-mail provisório, o que precisa ser confirmado com o Fabrício antes.

Ordem: primeiro as duas com senha ativa, depois as quatro pendentes.

**Critério de pronto:** na tela de Membros da produção, nenhuma conta
`@teste.com` aparece como ativa, e o `audit_logs` tem uma linha por desativação
com quem fez, o que só é possível depois do item 6.

### 9. Dado de demonstração separado do real

**Bloco:** 2 · **Depende de:** 8 · **Estado:** **feito em 10/08/2026**

> **Escolhida a saída do meio: marcar com um campo.** Remover apagaria um
> cenário que serve para vender o produto, e mover para uma empresa
> "Demonstração" mentiria sobre quem é a J&J no cadastro. O campo responde a
> pergunta do critério com uma consulta, é aditivo e é reversível.
>
> **A medição achou duas coisas que o item não sabia:**
>
> 1. **Duas interações de demonstração estão em empresas REAIS.** Herdar a marca
>    do pai deixaria as duas passando por trabalho de cliente. Por isso
>    `Interacao` ganhou coluna própria, e marco, tarefa, ticket e visita não:
>    para esses a pergunta se responde olhando o projeto ou a empresa.
> 2. **A produção tem UMA empresa de cliente.** As outras três que apareciam
>    como "reais" na primeira contagem ("Clinica Teste Deploy", "Clinica Agenda
>    Teste", "Clinica Compliance Teste") já estavam APAGADAS por soft delete, e
>    só apareciam porque a varredura por SQL cru enxerga apagado. Corrigido
>    depois de medir de novo, e vale a lição: contagem por SQL cru e contagem
>    pelo client respondem perguntas diferentes.
>
> **A regra mora num lugar só**, `common/demonstracao.ts`, pelo mesmo motivo de
> `whereEmAberto`: duas cópias da mesma regra é como o card "Tickets abertos" e
> a lista da empresa passaram a discordar na tela.
>
> **O alcance é maior que o dashboard, e precisa ser.** Projeto de demonstração
> deixou de gerar alerta de compliance no cron, e os alertas que já nasceram
> somem do sino e do e-mail diário por filtro de leitura, não por exclusão: o
> dia em que um deles virar cliente, os alertas voltam sozinhos. Tarefa de
> projeto de demonstração também sai de "Minhas tarefas".
>
> **Medido no banco local**, marcando uma empresa e os dois projetos dela:
>
> | Cartão | tudo real | com a empresa marcada |
> |---|---|---|
> | Projetos em execução | 1 | **0** |
> | Concluídos | 2 | **1** |
> | Tickets abertos | 3 | **2** |
> | Tickets em atraso | 3 | **2** |
> | Marcos vencendo em 7 dias | 1 | **0** |
> | Empresas na concentração | 3 | **2** |
>
> Os seis números mudaram, que é exatamente o tamanho da mentira que o dashboard
> contava.
>
> Na tela, empresa e projeto de demonstração ganham o selo "Demonstração", e
> continuam na lista: eles servem para mostrar o produto, só não podem ser
> contados como cliente.
>
> Checagem nova no verificador (43 no total): "dashboard não conta dado de
> demonstração", cobrando a coluna no schema e os recortes no serviço.
>
> **A produção foi marcada em 10/08/2026**, depois do deploy da migration, com
> backup antes (274 registros) e conferência independente depois:
>
> ```
> CONFERIDO: 11 marcação(ões), e as contagens batem com a lista.
>   empresas de demonstração: 2, reais: 1
>   projetos de demonstração: 4, reais: 1
>   linhas de auditoria: 174 -> 185
> ```
>
> As 11 linhas de auditoria saíram assinadas.
>
> **O critério está cumprido:** a pergunta "quantos projetos reais existem" tem
> resposta sem abrir arquivo de ids, e a resposta é **1**, o Novalgina Linha 9
> da Opella. Os outros 4 projetos vivos são cenário.
>
> Esse número é o valor deste item: antes o dashboard dizia 5, e quem lesse
> concluiria coisas sobre uso que não tinham base nenhuma.

A produção mistura cenário de demonstração e dado real. Medido contra
`docs/demo-producao-ids.json`: das 6 empresas, 2 são demonstração; dos 6
projetos, 4; dos 9 marcos, 8; das 5 interações, **as 5**. Enquanto isso durar,
todo número do dashboard é parte real e parte encenação, e nenhuma conclusão
sobre uso vale.

Três saídas possíveis, a decisão é do Nícolas: remover, marcar com um campo, ou
mover para uma empresa "Demonstração" claramente identificada.

**Critério de pronto:** dá para responder "quantos projetos reais existem" sem
abrir o arquivo de ids.

### 10. Backup com rotina, cópia fora da máquina e restauração testada

**Bloco:** 2 · **Depende de:** 7 · **Estado:** **dois terços feitos em
10/08/2026. Segue aberto: falta a rotina e a cópia fora do Mac, que são escolha
do Nícolas**

> **O mecanismo estava quebrado contra a produção, e ninguém sabia.** Ao começar
> o item 8 o backup foi o primeiro passo, e ele abortou:
>
> ```
> npm run backup:producao
>   Cargo: 4 registro(s)
>   ERRO: The column `users.codigoConviteHash` does not exist
> ```
>
> A produção está três migrations atrás do repositório, e o exportador lia pelos
> delegates do Prisma, que pedem as colunas que o SCHEMA declara. Ou seja: o
> backup parava de funcionar exatamente na situação em que ele é mais
> necessário, que é quando código e banco estão fora de sincronia. E parava
> depois de já ter lido uma tabela, então quem só olhasse o começo da saída
> acharia que tinha rodado.
>
> **O exportador passou a ler por SQL cru.** `SELECT *` não sabe o que o schema
> espera: traz o que a tabela tem. Coluna que existe no banco e não no schema
> entra no arquivo, coluna que existe no schema e não no banco não é procurada,
> e tabela que não existe é pulada com aviso em vez de derrubar tudo.
>
> **A diferença virou a informação mais importante da saída:**
>
> ```
> User: 8 registro(s)   [só no banco: codigoConvite | só no schema: codigoConviteHash]
> NotificacaoDestinatario: TABELA NÃO EXISTE neste banco
> ...
> ATENÇÃO: este banco não bate com o schema do repositório.
> ```
>
> **O importador parou de descartar coluna em silêncio.** Ele já ignorava chave
> desconhecida, o que é certo; agora ele diz qual descartou. Isso deixou de ser
> hipótese no mesmo dia: um backup da produção traz `codigoConvite` em texto
> puro, e restaurar esse arquivo num banco com o schema novo apaga essa coluna.
> Quem restaura precisa ler isso na tela.
>
> **Restauração do formato novo, testada num banco descartável.** Origem: o
> banco local, que está em dia com o schema. Destino: `crm_restore_teste`,
> criado, usado e apagado.
>
> | Tabela | Origem | Restaurado |
> |---|---|---|
> | cargos | 5 | 5 |
> | users | 8 | 8 |
> | leads | 3 | 3 |
> | empresas_clientes | 4 | 4 |
> | projetos | 5 | 5 |
> | tarefas | 4 | 4 |
> | interacoes | 2 | 2 |
> | tickets | 4 | 4 |
> | competencias | 5 | 5 |
> | etapas_projeto | 6 | 6 |
> | visitas | 7 | 7 |
> | cron_execucoes | 1 | 1 |
> | notificacoes | 7 | 7 |
> | notificacao_destinatarios | 15 | 15 |
> | audit_logs | 59 | 59 |
> | _CompetenciaToUser | 5 | 5 |
> | _EquipeDoProjeto | 2 | 2 |
>
> 17 tabelas, 142 registros, tudo batendo, incluindo as duas de ligação que já
> tinham sumido calado uma vez.
>
> **E o backup da produção existe de novo**, com 249 registros, em
> `~/Desktop/backups-crm/backup-crm-2026-08-10-producao.json`, com permissão 600
> como os `.env`. É ele que destrava o passo 1 do item 8.
>
> **O que continua faltando, e é decisão dele:** a rotina rodando sozinha e a
> cópia fora deste Mac. As duas viraram passo a passo em `CHAVES-PENDENTES.md`,
> com a recomendação registrada: ligar o backup contínuo do próprio Neon é o
> backup de verdade, e este script agendado é segunda cópia, porque só roda com
> o Mac ligado.

O mecanismo existe e a restauração já foi provada uma vez contra um banco
descartável. O que não existe é a prática: um único arquivo, de 07/08, morando
só neste Mac, com dado pessoal e hash de senha de 8 pessoas.

Depende do item 7 porque restaurar um backup feito no formato antigo, com código
de convite em claro, reintroduz o problema.

**Critério de pronto:** existe rotina agendada rodando sozinha, existe cópia
fora deste Mac, e a restauração do formato novo foi testada num banco
descartável com a contagem das tabelas batendo.

### 11. Higiene de ambiente e endereços

**Bloco:** 2 · **Depende de:** nada · **Estado:** **feito em 09/08/2026**

> As quatro medidas antes de mexer, e o que foi feito em cada uma.
>
> **Permissão dos arquivos.** `.env` e `.env.local` estavam em `644`, legíveis
> por qualquer processo do usuário, com senha de banco e o `JWT_SECRET`
> dentro. Só o `.env.producao` estava certo, em `600`. Os três agora estão em
> `600`, e o verificador passou a conferir isso a cada execução, porque
> permissão de arquivo regride sozinha na próxima vez que alguém copiar.
>
> **A credencial morta.** Confirmado medindo: o `.env` aponta para
> `ep-rapid-dew` (branch `vercel-dev`) e a conexão responde
> `password authentication failed`. Não tenho como consertar essa credencial, e
> a branch nem deveria voltar.
>
> A saída não foi arrumar, foi **tirar a armadilha**: `start:dev` e
> `start:debug` deixaram de existir. Os dois rodavam `nest start` sem carregar o
> `.env.local`, então pegavam o `.env`. Enquanto a credencial valia, isso era
> mexer em banco remoto achando que era a máquina, que é literalmente o
> incidente que o relatório de 04/08 registra. Depois que ela morreu, virou um
> comando documentado no README que só falha. Sobrou `start:local`, que é o
> único que sobe a API aqui, e conferi que ele continua acertando o banco da
> máquina: o heartbeat que a API devolve em `/health/cron` é exatamente a linha
> gravada em `cron_execucoes` do `crm_dq_local`.
>
> **O `.env` fica, mesmo morto**, e o motivo virou comentário no
> `package.json`: ele é o arquivo que a CLI do Prisma carrega sozinha quando
> ninguém manda outra coisa, e um padrão que não conecta é rede de proteção. Um
> `npx prisma migrate dev` distraído bate num banco que não existe em vez de
> bater na produção.
>
> **O comentário que mentia.** O topo do `.env.local` afirmava que o `.env`
> aponta para o Neon de produção. Aponta para dev, e dev está morto. Corrigido.
> Era a quarta mentira desta família, e as quatro têm a mesma origem: texto que
> descreve o sistema, envelhece, e ninguém confere.
>
> **O endereço da API.** Não existia em lugar nenhum do repositório: só como
> variável de ambiente no painel da Vercel. Se aquela conta se perdesse,
> ninguém saberia dizer onde a API está no ar. Nasceu `docs/ENDERECOS.md`, com
> front, API, os dois endereços de saúde, GitHub e as duas branches do banco
> com o jeito de saber qual é qual pelo host (`sweet-salad` é produção,
> `rapid-dew` é a morta, `localhost` é a máquina). **Nenhum segredo entra
> nesse arquivo:** só endereço público e nome de painel.
>
> O `api/README.md` mandava rodar `npm run start:dev`. Foi reescrito com o
> caminho que funciona e com a tabela dos três arquivos de ambiente.
>
> `npm run entrega:check` foi de 15 para 20, e ganhou 4 checagens novas: as
> três de permissão de arquivo e a que barra o retorno de `start:dev`.

Quatro coisas pequenas, medidas hoje:

- `api/.env` está em **644** (legível por qualquer processo do usuário) e tem
  senha do banco e o `JWT_SECRET`. O `.env.producao` está corretamente em 600.
- As credenciais de `api/.env` apontam para a branch `vercel-dev`
  (`ep-rapid-dew`) e **estão mortas**: a conexão responde
  `password authentication failed`. Ou seja, `npm run start:dev` não funciona.
- O comentário no topo de `api/.env.local` afirma que o `.env` aponta para a
  produção. Aponta para dev. É a quarta mentira de documentação desta família.
- O endereço da API em produção não está em lugar nenhum do repositório, só na
  variável de ambiente da Vercel.

**Critério de pronto:** `stat` mostra 600 no `api/.env`; `npm run start:dev`
sobe ou o script é removido; o comentário some; e
`npm run entrega:check` passa em "endereço da API de produção está no
repositório".

---

# BLOCO 3: fechar o que contradiz o discurso de venda

**Nesta ordem.** O teste vem antes das correções de propósito: ele precisa
falhar primeiro e provar os buracos, senão vira teste escrito para passar.

### 12. Teste de tabela: rota por permissão, nas 70 rotas

**Bloco:** 3 · **Depende de:** nada · **Estado:** **feito em 09/08/2026, e falhando de propósito**

> **Atenção ao ler o verificador daqui em diante:** ele foi de 23 para **22**
> checagens passando, e "api: testes" está vermelho. Isso é o item funcionando,
> não uma regressão. O teste nasceu falhando em exatamente três casos, e eles
> somem quando os itens 13 e 15 forem feitos. Uma quarta falha, ou as três
> sumindo sem os itens terem sido feitos, aí sim é problema.
>
> **Onde:** `api/src/common/rbac/rotas-e-permissoes.spec.ts`.
>
> **Como ele lê a verdade.** Não é varredura de texto. Ele caminha o grafo de
> módulos a partir do `AppModule` e lê a metadata do Nest (`PATH_METADATA`,
> `METHOD_METADATA`, `PERMISSAO_KEY`, `IS_PUBLIC_KEY`), que é **a mesma que o
> `PermissionsGuard` e o `JwtAuthGuard` consultam em runtime**. Um regex sobre o
> arquivo poderia discordar do que o Nest enxerga; isto não pode.
>
> Caminhar o grafo em vez de ler o disco tem uma consequência boa: arquivo de
> controller que ninguém registrou num módulo não serve rota nenhuma, e agora
> isso é detectado, em vez de a rota simplesmente não existir em silêncio.
>
> **A tabela declara `AUTENTICADO` como valor explícito**, para rota que exige
> sessão e nenhuma permissão de módulo (as três de `/users/me` e o
> "Hello World!" do Nest). Sem esse valor, uma rota que perdesse a guarda por
> acidente cairia no mesmo balde das que legitimamente não têm, e o teste
> ficaria verde justamente no caso que ele existe para pegar.
>
> **As três falhas, com a mensagem que o teste dá:**
>
> ```
> ● GET /cargos
>     Expected: "CARGOS_MANAGE"
>     Received: "AUTENTICADO"
> ● GET /cargos/:id
> ● POST /notificacoes/executar-agora
>     Expected: "PROJETOS_WRITE"
>     Received: "NOTIFICACOES_READ"
> ```
>
> `POST /notificacoes/executar-agora` foi declarado como `PROJETOS_WRITE`
> porque quem força o vigia de prazos é quem mexe em prazo. Reusa permissão que
> já existe em vez de criar uma quarta.
>
> **As quatro garantias, cada uma provada plantando o defeito e medindo:**
>
> | Defeito plantado | O que o teste fez |
> |---|---|
> | Rota nova sem entrada na tabela | falhou e **nomeou** `GET /dashboard/rota-nao-declarada` |
> | Guarda removida de `GET /empresas` | falhou no caso dessa rota |
> | Entrada na tabela para rota que não existe | falhou e nomeou a órfã |
> | Arquivo de controller não registrado em módulo | falhou na contagem de controllers |
>
> Tudo revertido depois, e o teste volta a falhar em exatamente três.
>
> **Dois erros meus no caminho, os dois pegos por medição.** O primeiro: usei
> `require()` para carregar os controllers e o lint barrou; troquei por
> `import()` dinâmico, que não resolve `.ts` aqui, e **todos os 70 casos
> passaram a falhar**. O segundo, já na caminhada do grafo: eu marcava o módulo
> como visto antes de resolver a classe, então todo módulo simples era pulado e
> a lista voltava vazia, com os 70 falhando de novo. Nos dois casos o sintoma
> foi o mesmo, e ele é instrutivo: **um teste de cobertura que falha em tudo
> quase sempre está medindo nada, não achando tudo errado.**
>
> Suíte: 176 testes em 15 suítes, 173 passando.

Uma tabela declarando, para cada uma das 70 rotas, qual permissão ela exige, e
um teste que compara a declaração com o que os decoradores realmente dizem.
Rota nova sem entrada na tabela quebra o teste.

Foi assim que `GET /cargos` ficou sem guarda nenhuma sem ninguém notar, e é
assim que se evita a próxima.

**Escrever antes das correções, e commitar falhando**, com as três falhas
esperadas: `GET /cargos`, `GET /cargos/:id` e `POST /notificacoes/executar-agora`.

**Critério de pronto:** `npx jest` na api mostra o teste novo falhando em
exatamente três casos, e nenhum a mais. Registrar a saída aqui.

### 13. Guarda em GET /cargos e GET /cargos/:id

**Bloco:** 3 · **Depende de:** 12 · **Estado:** **feito em 09/08/2026**

> **Não foi só um decorador, e o motivo é a razão de eu ter medido antes.**
>
> `MembroFormModal` buscava `GET /cargos` para preencher o seletor de cargo do
> cadastro de membro. Ou seja, baixava o mapa de permissões inteiro da empresa
> para desenhar um dropdown. Fechar a rota em `CARGOS_MANAGE` e parar por aí
> deixaria o seletor **vazio** para quem tem `USUARIOS_MANAGE` e não tem
> `CARGOS_MANAGE`, e vazio **em silêncio**, porque a tela tratava o erro com um
> `catch` que zerava a lista.
>
> Em produção ninguém quebraria hoje (CEO e Desenvolvedor têm as duas
> permissões). Mas o dia em que alguém criasse um cargo de RH com
> `USUARIOS_MANAGE` e sem `CARGOS_MANAGE`, o cadastro de membro pararia sem
> mensagem nenhuma.
>
> **A saída seguiu um precedente que já existe nesta base:** nasceu
> `GET /cargos/atribuiveis`, guardada por `USUARIOS_MANAGE`, devolvendo só
> `id`, `nome` e `nivel`. É o mesmo desenho de `GET /visitas/consultores`, que
> existe pela mesma razão: quem precisa da lista para trabalhar recebe a lista,
> e não o cadastro inteiro por tabela. Escolher o cargo de alguém é gerenciar
> **membro**, não gerenciar cargo.
>
> O `nivel` vai junto de propósito: é com ele que a tela desabilita o cargo
> fora do alcance de quem cadastra. Sem ele, a hierarquia só apareceria como
> erro depois do formulário inteiro preenchido.
>
> E o `catch` que zerava a lista virou mensagem: lista vazia esconde o motivo.
>
> Medido:
>
> | O que | CEO | Coordenador | Analista |
> |---|---|---|---|
> | `GET /cargos` | 200 | **403** | **403** |
> | `GET /cargos/:id` | 200 | **403** | **403** |
> | `GET /cargos/atribuiveis` | 200 | 403 | 403 |
>
> Payload de `/cargos/atribuiveis`: `['id', 'nivel', 'nome']`, sem `permissoes`.
>
> Na tela, como CEO: o formulário de membro carrega os 5 cargos, com
> Administrador e CEO desabilitados com "(do seu nível para cima)", e a tela de
> Cargos continua abrindo inteira.
>
> Na tela, como Analista digitando `/cargos` no endereço: **a página não
> renderiza mais**. Antes ela abria completa.
>
> **Fechar o buraco expôs outro, e ele já está na fila.** A mensagem que o
> Analista vê agora é "Não foi possível carregar os cargos. Isso costuma ser
> passageiro. Tente de novo", com "Permissão necessária: CARGOS_MANAGE" em
> letra miúda. Falta de permissão não é falha passageira, e o nome interno da
> permissão não é texto de interface. É o item 20.

Duas das 70 rotas não têm `@RequirePermissao`. Qualquer pessoa autenticada,
inclusive o Analista, lê o mapa completo de permissões da empresa. Conferido na
tela: o Analista digita `/cargos` no endereço e a página renderiza inteira. O
menu esconde, a API entrega.

**Critério de pronto:** o teste do item 12 passa nesses dois casos, e
`npm run entrega:check` passa em "toda rota autenticada tem `@RequirePermissao`".

### 14. Telefone fechado em GET /users

**Bloco:** 3 · **Depende de:** 13 · **Estado:** **feito em 10/08/2026**

> **A regra passou a morar no serviço, e quem pede virou argumento obrigatório.**
>
> `semSegredos()` agora recebe quem está pedindo e devolve o telefone só para
> quem tem `USUARIOS_MANAGE` e para o dono do número. Quem pede é argumento
> **obrigatório** de propósito: se fosse opcional, um método novo que esquecesse
> de passá-lo voltaria a entregar o número de todo mundo, e voltaria em
> silêncio. Com ele obrigatório, esquecer não compila.
>
> Telefone de terceiro vira `null`, não some da resposta. `null` é o que o campo
> já vale para quem não cadastrou número, então a tela trata os dois casos do
> mesmo jeito e o tipo `Usuario` do front continua o mesmo.
>
> **Não foi só o `findAll`.** Fechar a lista e deixar `GET /users/:id` aberta
> daria o mesmo resultado com mais cliques: bastaria pedir de um em um. As duas
> rotas passam pelo mesmo `semSegredos`, e o teste cobre as duas.
>
> **Medido com dois tokens, contra a API local, no banco de teste** (8 contas, 4
> com telefone cadastrado):
>
> | Pessoa | tem número no banco | CEO vê | Coordenadora vê |
> |---|---|---|---|
> | Fabrício (CEO) | sim | sim | **null** |
> | Renata (Coordenadora) | sim | sim | **sim, é dela** |
> | Marcos (Consultor) | sim | sim | **null** |
> | Juliana (Consultora) | sim | sim | **null** |
> | outras 4 contas | não | null | null |
>
> Telefones que saem na resposta: **CEO 4 de 8, Coordenadora 1 de 8**. Antes a
> Coordenadora recebia os 4.
>
> `GET /users/:id` como Coordenadora: o de terceiro responde 200 com telefone
> `null`, o dela mesma responde 200 com o número. `GET /users/me` continua
> trazendo o próprio número, que é o que a tela de Perfil edita.
>
> **Na tela, conferido nos dois cargos.** Logada como Renata, a linha do CEO e a
> dos dois consultores mostram só o e-mail; a dela mostra e-mail e telefone.
> Logado como Fabrício, as quatro linhas mostram o número.
>
> **A tela parou de repetir a regra.** `membros/page.tsx` escondia o telefone
> com `podeGerenciar || membro.id === eu?.id`. Com a API decidindo, isso virou
> código morto que dizia a mesma coisa em dois lugares, e o comentário que
> admitia "isto é decisão de tela, não de API" saiu junto.
>
> Testes novos em `users.service.spec.ts` (5 casos): gestor vê tudo, quem só tem
> `USUARIOS_READ` vê o próprio e `null` nos outros, a rota por id fecha nos dois
> sentidos, e o hash da senha continua fora da resposta nos dois cargos.
>
> **Varredura do resto da API:** nenhuma outra rota devolve telefone de membro.
> `projetos` (equipe), `visitas` (consultor e a lista de consultores),
> `tarefas` (responsável), `tickets` e `interações` (quem registrou) e
> `dashboard` já usam `select` enxuto com id, nome, e-mail e especialidade. O
> único outro lugar que devolve o telefone é a resposta do login, e ali é o
> próprio dono.

`semSegredos()` remove `senhaHash` e `codigoConvite` e deixa o telefone passar.
Medido com o token da Coordenadora: recebe o telefone do CEO e dos dois
consultores. A tela esconde, a rota não, que é a mesma maquiagem que o projeto
já condenou ao restringir o valor de contrato na API e não no front.

Regra: telefone sai para quem tem `USUARIOS_MANAGE` e para o dono do número.

**Critério de pronto:** `npm run entrega:check` passa em "telefone não sai de
`GET /users`", e medido com dois tokens: o Coordenador vê só o próprio número, o
CEO vê todos.

### 15. executar-agora exige permissão de escrita

**Bloco:** 3 · **Depende de:** 14 · **Estado:** **feito em 09/08/2026, e mede menos do que parece**

> Uma linha: `NOTIFICACOES_READ` virou `PROJETOS_WRITE`. Nenhuma tela chama
> esta rota, então não havia o que quebrar.
>
> **A parte honesta:** medido depois, isso **não restringe ninguém hoje**. Os
> quatro cargos de produção têm `PROJETOS_WRITE`, inclusive o Analista, então
> quem podia disparar o cron antes continua podendo. O Analista devolve 201
> aqui, igual a antes.
>
> | Cargo (produção) | tem PROJETOS_WRITE |
> |---|---|
> | Desenvolvedor | sim |
> | CEO | sim |
> | Coordenador | sim |
> | Analista | sim |
>
> O que mudou é a semântica: ação de escrita deixou de estar atrás de permissão
> de leitura, e a tabela do item 12 passa a cobrar isso para sempre. O que NÃO
> mudou é quem consegue chamar.
>
> Se a intenção for de fato restringir, o caminho é uma permissão própria
> (`NOTIFICACOES_WRITE`), concedida só aos cargos de topo. Isso entra em três
> lugares (constante da API, espelho de tipos do front, lista da tela de
> Cargos) e é decisão do Nícolas, não minha. Fica registrado aqui em vez de
> virar mudança silenciosa.

`POST /notificacoes/executar-agora` dispara o cron e está atrás de
`NOTIFICACOES_READ`. Medido: o Analista recebe 201. Permissão de leitura não
protege ação de escrita.

**Critério de pronto:** o Analista recebe 403 e o teste do item 12 cobre o caso.

---

# BLOCO 4: qualidade que se vê

Sem ordem obrigatória entre si. Os que têm varredura no verificador fecham
sozinhos.

### 16. Gaveta do celular: transform no lugar de opacity, e Esc

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026, e o
diagnóstico da fila estava incompleto**

> **Tirar o `opacity` não bastava, e descobrir isso foi o item.**
>
> O fundo da gaveta entrava com `opacity: 0 -> 1`, que é o defeito que a fila
> descreve. Tirei: o fundo passou a nascer com a cor final, e quem entra
> deslizando é a gaveta, por transform. Isso fechou a checagem.
>
> **Só que a gaveta deslizava de `-100%`, e isso é a MESMA classe de defeito.**
> Medido em 390px com a aba em segundo plano, que é a condição que já derrubou
> esta tela duas vezes:
>
> | Motor do deslize | Onde a gaveta parou | O que a pessoa via |
> |---|---|---|
> | motion, `x: '-100%' -> 0` | `translateX(-130px)` | metade da gaveta fora da tela |
> | CSS, mesmo `-100%` | `translateX(-256px)` | gaveta **inteira** fora, e o fundo escuro clicável por cima |
> | CSS, `-16px` (como ficou) | `translateX(-16px)` | 240 dos 256px na tela, gaveta usável |
>
> Trocar de motor não resolveu nada, porque o problema nunca foi o motor.
> **Toda animação segura o estado inicial enquanto não avança**, e ela não
> avança com a aba em segundo plano. Então o estado inicial precisa ser um
> estado aceitável. `opacity: 0` não é. `-100%` também não é. `-16px` é, e é a
> mesma distância que o resto do `globals.css` já usava sem ninguém ter escrito
> por quê.
>
> A regra no `globals.css` foi reescrita com isso: não é "não animar opacity",
> é "o estado inicial da animação tem que ser um estado em que dá para usar a
> tela".
>
> **É defeito de padrão, e a varredura prova que sobrou zero:** o `KanbanCard`
> tinha os dois casos, a entrada em `opacity: 0` e o card arrastado em
> `opacity: 0.4` vindo do `animate`. O primeiro virou só deslocamento; o segundo
> virou classe estática, então um card preso por animação parada continua opaco
> em vez de virar um lead meio invisível no funil.
>
> **Esc fecha a gaveta**, como já fechava o Modal, e o ouvinte só existe
> enquanto ela está aberta.
>
> Medido na tela, em 390px, com `visibilityState: hidden`:
>
> | O que | Resultado |
> |---|---|
> | fundo ao abrir | `opacity: 1`, escurece de uma vez |
> | posição da gaveta | 16px deslocada, 240px visíveis |
> | Esc | fecha |
> | toque fora | fecha |
> | depois de fechar, quem recebe o toque no meio da tela | a grade do dashboard, e não um overlay invisível |
>
> Verificador: de 28 para 30 de 40.

`Sidebar.tsx` monta o fundo da gaveta com `initial={{ opacity: 0 }}`, que é
exatamente o que a regra de `globals.css` proíbe. Medido em 390px com
`visibilityState = hidden` e 0 frames em 600ms: o fundo fica com `opacity 0` e
`pointer-events auto`, e o clique não chega em nada da página. A gaveta abre
invisível e engole todo toque. E não fecha com Esc, ao contrário do Modal.

**É defeito de padrão, não de instância:** o verificador já achou o mesmo em
`KanbanCard.tsx`. Fecha com varredura, não com o conserto de um arquivo.

**Critério de pronto:** `npm run entrega:check` passa em "nenhuma animação
decide se algo é visível" e em "gaveta do celular fecha com Esc". Mais a
conferência humana da gaveta em 390px.

### 17. Typecheck da API consertado e no mesmo comando do lint

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 09/08/2026**

> **O conserto foi pequeno. O que importa é o que passou a impedir a volta.**
>
> Sobrou um erro só, em `users.service.spec.ts`: o teste lia `.data` de
> `mock.calls[0][0]`, que é `unknown`, antes de tipar. O segundo erro tinha
> caído junto no item 7. Agora o cast é do argumento inteiro, o mesmo padrão
> que o resto dos specs já usava.
>
> **Por que ficou quebrado de 07/08 a 09/08 sem ninguém ver**, e é a parte que
> vale guardar: duas coisas se somaram. O `nest build` exclui os `*.spec.ts`,
> então o build seguia verde. E o `npm run lint` rodava com `--fix`: ele
> consertava e saía verde, então o zero era o estado **depois** do conserto, e
> não o do código commitado. Dava para ter lint verde com a compilação
> quebrada, e foi exatamente o que os relatórios daqueles dias afirmaram.
>
> O `lint` agora é `npm run typecheck && eslint`, **sem `--fix`**. Quem quiser
> o conserto automático chama `lint:fix` de propósito. **É defeito de classe,
> então foi corrigido nos dois projetos:** a `web/` não tinha nem script de
> typecheck, e agora tem, com o `lint` chamando ele antes.
>
> Provado nos dois sentidos, plantando defeito e medindo:
>
> | O que plantei | `npm run lint` | O arquivo |
> |---|---|---|
> | `const x: number = 'texto'` | **falha, código 2**, com `TS2322` na saída | n/a |
> | formatação ruim | **falha, código 1**, com o erro do prettier | fica **intacto**: acusa e não conserta |
> | `npm run lint:fix` na mesma formatação ruim | n/a | conserta, como deve, porque foi pedido |
>
> Tudo revertido depois, e o `lint` volta a sair 0.
>
> Duas checagens novas no verificador, uma por projeto: o script `lint` não
> pode ter `--fix` e precisa chamar o typecheck. É a trava contra o retorno,
> porque este defeito não aparece quebrando nada: ele aparece como um verde
> que não quer dizer o que parece.
>
> `npm run entrega:check` foi de 20 para 23, com "api: typecheck" passando pela
> primeira vez desde 07/08.

`tsc --noEmit` na api falha com dois `TS2571` em `users.service.spec.ts`,
introduzidos pela limpeza de lint de 07/08. Passou despercebido porque
`tsconfig.build.json` exclui `*.spec.ts` e `npm run lint` roda com `--fix`.

Consertar, e fazer `npm run lint` deixar de usar `--fix`, senão o número
continua sendo o resultado depois do conserto e não o estado do código.

**Critério de pronto:** `npm run entrega:check` passa em "api: typecheck", e
`npm run lint` na api falha quando existe erro de formatação.

### 18. datetime-local padronizado

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> Nasceu `CampoDataHora`, no mesmo arquivo do `CampoData` e pelo mesmo motivo:
> `datetime-local` é desenhado pelo navegador, dentro do shadow DOM, e num Mac
> em português ele escreve a data por extenso enquanto o resto do CRM escreve
> 16/08/2026. Era o último campo nativo do sistema, e estava na tela mais usada
> em campo.
>
> **São dois campos e não um**: quem marca visita sabe o dia antes de saber a
> hora, e digitar "16/08/2026" e "14:30" em campos separados é mais rápido do
> que caçar cursor dentro de um campo único. Cada um com máscara própria, e o
> formulário continua lendo `aaaa-mm-ddThh:mm` num campo oculto, então a agenda
> não mudou uma linha de como envia os dados.
>
> **A sincronia com o valor de fora é feita durante a renderização, não em
> effect.** A agenda empurra o fim quando o início muda ("uma hora depois"), e a
> regra `react-hooks/set-state-in-effect` proíbe o caminho preguiçoso. A
> comparação é contra o que o texto atual representa, e não contra o valor
> anterior: enquanto a pessoa digita "16/0" o campo emite vazio, e sem essa
> guarda o vazio voltaria e apagaria o que ela escreveu.
>
> **Um defeito de largura apareceu e foi consertado no mesmo item:** `w-full` e
> `w-24` têm a mesma especificidade, então quem vence é a ordem da folha de
> estilo, não a ordem da string. O campo de hora ganhava `w-full` e espremia o
> de data até sobrar só o ícone do calendário. Agora cada input declara a
> própria largura, uma vez.
>
> Medido na tela: digitando `16082026` e `1430` no início, o campo mostra
> `16/08/2026` e `14:30`, o oculto vale `2026-08-16T14:30`, e o fim é empurrado
> sozinho para `15:30`. Digitando só `160`, o campo mostra `16/0` e o oculto
> fica vazio, sem apagar o que foi digitado. `datetime-local` no `web/src`:
> zero.

O `CampoData` unificou todo campo de data, menos o modal de visita, que usa dois
`datetime-local` nativos. É o navegador desenhando a data, e num Mac em
português ele escreve por extenso. É o defeito que o Nícolas relatou como "já
foi arrumado e voltou", ainda vivo na tela mais usada em campo.

**Critério de pronto:** `npm run entrega:check` passa em "nenhum
`datetime-local` fora do componente de data".

### 19. Content-Type fora dos GET

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026, e o
diagnóstico da fila estava errado**

> **O `Content-Type` saiu dos GET**, e agora só vai quando existe corpo. Num GET
> ele era mentira de qualquer jeito: não há conteúdo nenhum para tipar.
>
> **Só que o OPTIONS continuou.** Medido na aba de rede logo depois da mudança:
> cada chamada autenticada seguiu aparecendo duas vezes. A causa não era o
> `Content-Type`. É o `Authorization`, que também não está na lista de
> cabeçalhos simples do CORS e sozinho já obriga o preflight. Nenhuma faxina no
> front tira isso: token no cabeçalho é o desenho da autenticação.
>
> **O que dá para fazer é não repetir o preflight a cada chamada**, e é o que
> foi feito: `maxAge: 7200` no CORS da API. Sem ele o navegador guarda a
> resposta do OPTIONS por 5 segundos, então uma tela que recarrega lista a cada
> minuto paga o dobro de requisições para sempre. Medido no cabeçalho da
> resposta:
>
> ```
> OPTIONS /users/me
> Access-Control-Max-Age: 7200
> ```
>
> **O que NÃO foi possível medir aqui:** o navegador de automação não reaproveita
> o cache de preflight, então as três chamadas seguidas continuaram com um
> OPTIONS cada uma nesta máquina. Num navegador normal a resposta fica guardada
> por 2 horas por URL. Fica registrado como medido no servidor e não medido no
> cliente, em vez de virar um "resolvido" que a aba de rede desmentiria.

`lib/api.ts` manda `Content-Type: application/json` em toda requisição,
inclusive GET sem corpo. Isso torna toda chamada uma requisição não simples e
força um `OPTIONS` antes de cada uma. Medido na aba de rede: cada chamada
aparece duas vezes.

**Critério de pronto:** `npm run entrega:check` passa em "GET não manda
`Content-Type` à toa", e a aba de rede mostra uma requisição por chamada.

### 20. 401, 403 e 500 com mensagens distintas e sem jargão

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> **A diferença entre os três não é de redação, é de o que fazer.** Era esse o
> defeito: falta de permissão aparecia com a mesma frase de falha passageira e
> o mesmo botão "Tentar de novo", que ali nunca ia funcionar. Botão que só dá
> erro ensina que o sistema está quebrado.
>
> | Caso | O que a tela diz | Oferece "Tentar de novo" |
> |---|---|---|
> | 403 | "Seu cargo não tem acesso a esta parte do sistema." mais uma linha dizendo que não é erro, é permissão | **não** |
> | 401 | "Sua sessão expirou." e o caminho de entrar de novo | **não** |
> | 500 e demais | "Isso costuma ser passageiro. Tente de novo..." | sim |
> | sem conexão | "O sistema não conseguiu falar com o servidor..." | sim |
>
> **O nome interno da permissão saiu da tela.** O guard da API mandava
> `Permissão necessária: USUARIOS_READ` como mensagem, e a tela imprimia isso.
> Agora a mensagem é humana e o nome da permissão vai num campo à parte
> (`permissaoNecessaria`), que serve para suporte e não é o que a tela mostra.
>
> **O status precisou chegar até a tela para isso ser possível.** `lib/api.ts`
> lançava `new Error(texto)` e o status se perdia no caminho: nasceu `ErroDaApi`
> com `status`, e as 11 telas que usam `EstadoErro` passaram a guardá-lo.
>
> Medido na tela, logado como Analista abrindo `/membros` pelo endereço: aparece
> "Seu cargo não tem acesso a esta parte do sistema", sem nome de permissão e
> sem botão. O 401 é o que já aparecia no login ("Sua sessão expirou"), e o
> caminho de 500 é o mesmo de antes, agora só para falha de verdade.

Hoje um 403 aparece como "Não foi possível carregar a equipe. Isso costuma ser
passageiro. Tente de novo", com um botão que nunca vai funcionar, e imprime
"Permissão necessária: USUARIOS_READ" na tela. Falta de permissão não é falha
passageira, e o nome interno da permissão não é texto de interface.

**Critério de pronto:** conferência humana descrita no verificador, com os três
casos abertos na tela.

### 21. Alvos de toque de 36px

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> Medição refeita em 390px, contando todo `button`, `a[href]` e `select` com
> altura menor que 36px, tela por tela:
>
> | Tela | Antes | Depois | Total de alvos |
> |---|---|---|---|
> | Agenda | **16** | **0** | 73 |
> | Projetos | 5 | 0 | 22 |
> | Minhas tarefas | 2 | 0 | 15 |
> | Dashboard | 1 | 0 | 20 |
> | Membros | 0 | 0 | 43 |
> | Empresas | 0 | 0 | 16 |
>
> O que subiu: as quatro visões da agenda e as setas (28px e 30px), os chips de
> visita no mês (19px), as marcas de tarefa (17px) e de prazo (19px), os filtros
> de estágio em Projetos e o par Minhas/Da equipe (28px), e o link "Ver projeto"
> do painel de alertas (16px).
>
> **A altura mínima vale só no celular** (`min-h-9 sm:min-h-0`) nos elementos que
> vivem dentro da célula do mês. No desktop o mouse acerta 19px sem dificuldade,
> e a célula do mês é apertada: forçar 36px lá empurraria o terceiro
> compromisso do dia para fora da célula. O alvo de toque é regra de toque.

Medido na Agenda em 390px: 16 alvos abaixo de 36px. Mês, Semana, Dia e Lista com
28px, as setas com 30px, e os blocos de visita com **19px**. A sessão que
estabeleceu os 36px consertou três pontos e não varreu o resto.

**Critério de pronto:** conferência humana, com a medição refeita em 390px nas
telas principais e o número de alvos abaixo de 36px registrado aqui.

### 22. Membros não oferece o que devolve 403

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> A tela passou a usar a MESMA regra da API (`exigirNivelMenor`): só oferece
> Editar, Resetar senha, Desativar e Excluir para quem tem cargo de nível
> **menor** que o seu. Comparação por nível, nunca por nome de cargo.
>
> "Enviar tarefa" continua aparecendo para todo mundo, e isso é de propósito:
> ela depende de `TAREFAS_WRITE`, não de hierarquia. Quem coordena a equipe
> distribui trabalho para quem está no mesmo nível.
>
> Medido na tela, logado como CEO (nível 100):
>
> | Linha | O que a tela oferece |
> |---|---|
> | Administrador (nível 100) | só "Enviar tarefa" |
> | o próprio CEO | só "Enviar tarefa" |
> | Coordenador, Analista, Consultores (níveis 60, 30, 20) | tudo |
>
> Antes, as três primeiras linhas ofereciam Editar, Resetar senha e Desativar, e
> os três devolviam 403.

Na lista de Membros, a linha de alguém do mesmo nível hierárquico oferece
Editar, Resetar senha e Desativar. Medido: os três devolvem 403. O cadastro já
foi corrigido para não oferecer cargo fora do alcance; a lista não.

**Critério de pronto:** conferência humana, logado como CEO, na linha do
Administrador.

### 23. Vocabulário do botão Evento

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> O botão virou "Nova visita", igual ao título do formulário que ele abre.
>
> O argumento de quem escreveu "Evento" está registrado no código: a agenda
> mostra prazo de projeto junto com visita, então o botão nomearia o que a tela
> comporta. Só que **o nome do botão promete o que ele CRIA**, e ele só cria
> visita: prazo de compliance nasce no projeto, não na agenda. Prometia uma
> coisa e entregava outra, e foi anotado em duas sessões diferentes sem nunca
> ser resolvido.

O botão do topo da Agenda diz "Evento" e abre um formulário chamado "Nova
visita". Anotado em duas sessões diferentes e nunca resolvido. A recomendação
registrada é voltar para "Nova visita", porque é a única coisa que o botão cria.

**Critério de pronto:** botão e título do formulário dizem a mesma palavra.

### 24. Dia civil no front

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> A conta passou a ser feita em dia civil de Brasília, com `Intl`, igual ao
> `inicioDoDiaCivil` da API. Nada de `-3` fixo: quem sabe horário de verão e
> mudança de fuso é o `Intl`, não a gente.
>
> **Vira comparação de dois inteiros** (número do dia desde a época, dos dois
> lados), porque data com hora sempre acha um jeito de escorregar um dia.
>
> **`diasAteOPrazo`, `urgenciaDoPrazo` e `textoPrazo` ganharam o instante como
> argumento**, com `new Date()` como padrão. Sem isso não havia teste possível:
> a função lia o relógio da máquina por dentro. Em produção ninguém passa nada.
>
> Provado pelo item 32, com a suíte rodando em `TZ=UTC`: às 21h30 de Brasília,
> quando o relógio UTC já virou o dia, o prazo de amanhã continua dizendo
> "Vence amanhã" e o de hoje continua dizendo "Vence hoje". Antes, nessa mesma
> hora, os dois andavam um dia.

`diasAteOPrazo` em `lib/formato.ts` usa `new Date()` com `setHours(0,0,0,0)`, ou
seja, a meia-noite **local do navegador**. Numa máquina em Brasília está certo.
Numa máquina em UTC, depois das 21h a conta anda um dia. É a mesma classe de
defeito que a API já pagou para consertar com `inicioDoDiaCivil`, e a regra não
foi estendida ao front.

**Critério de pronto:** teste do front (item 32) cobrindo a virada de dia com o
relógio da máquina em UTC.

### 25. Formatação de moeda centralizada

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> Nasceu `formatarMoeda` em `lib/formato.ts`, e as duas cópias à mão sumiram.
>
> **As cópias já discordavam**, que é o motivo de o item existir: o dashboard
> escondia os centavos e a tela do projeto os mostrava, então o mesmo contrato
> aparecia como "R$ 45.000" num lugar e "R$ 45.000,00" no outro.
>
> Centavos viraram opção em vez de virarem regra única, porque as duas leituras
> são legítimas: cartão de dashboard existe para dar ordem de grandeza, ficha de
> contrato existe para dar o número exato. O que não é legítimo é cada tela
> decidir isso sozinha.
>
> `style: 'currency'` fora de `lib/formato.ts`: zero.

Escrita à mão em `dashboard/page.tsx` e em `projetos/[id]/page.tsx`, enquanto
todo o resto do sistema centraliza formatação em `lib/formato.ts`. É a mesma
classe de duplicação que fez o card "Tickets abertos" discordar da lista.

**Critério de pronto:** `npm run entrega:check` passa em "formatação de moeda só
em `lib/formato.ts`".

### 26. forbidNonWhitelisted no ValidationPipe

**Bloco:** 4 · **Depende de:** 12 · **Estado:** **feito em 10/08/2026**

> Campo que não existe no DTO agora devolve 400 em vez de ser descartado em
> silêncio. O caso exato que a fila registrou:
>
> ```
> PATCH /tickets/:id  { "status": "RESOLVIDO" }
> antes:  200, e nada mudou
> agora:  400, "property status should not exist"
> ```
>
> **Ligar isto muda o contrato de todas as rotas de uma vez**, e é por isso que
> o item dependia do 12. A rede do teste de tabela segurou, e além dela foi
> feita uma varredura direta: as **25 rotas de escrita** foram chamadas com
> exatamente o conjunto de chaves que cada tela monta, lido componente por
> componente. Nenhuma teve campo recusado.
>
> | O que foi medido | Resultado |
> |---|---|
> | rotas de escrita testadas com o payload real das telas | 25 |
> | rotas com campo recusado | **0** |
> | `PATCH /tickets/:id` com `{status}` | 400, como deve |
> | 202 testes da API | verdes |

Hoje campo fora do DTO é descartado em silêncio com resposta 200. Medido:
`PATCH /tickets/:id` com `{status}` responde 200 e não muda nada. Nenhuma tela
cai nisso hoje, mas é fábrica de "cliquei e não aconteceu nada".

Depende do item 12 porque ligar isso muda o contrato de todas as rotas de uma
vez, e o teste de tabela é a rede que mostra o que quebrou.

**Critério de pronto:** `npm run entrega:check` passa em "`ValidationPipe`
recusa campo fora do DTO", e os 78 testes continuam verdes.

### 27. CNPJ com máscara, dígito verificador e unicidade

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> Três coisas, e a ordem entre elas é o que faz a unicidade funcionar.
>
> **Guardado só com dígitos.** É a decisão que sustenta o resto: com máscara,
> "12.345.678/0001-90" e "12345678000190" seriam duas empresas diferentes para o
> índice único, e o mesmo cliente entraria duas vezes. A tela manda como a
> pessoa digitou e a API normaliza, porque formulário é cliente e cliente não é
> para confiar.
>
> **Dígito verificador conferido** em `common/validadores/cnpj.ts`, com 6 testes:
> aceita Petrobras e Banco do Brasil com e sem máscara, recusa um dígito
> trocado, recusa tamanho errado e recusa os 14 dígitos iguais. Tamanho certo
> com dígito errado é o erro que ninguém percebe na hora e todo mundo descobre
> no dia de emitir documento.
>
> **Unicidade já existia no banco e não chegava na tela:** o `@unique` estava lá
> desde o começo, mas o erro subia cru do Prisma e a tela dizia "Internal server
> error" para o caso mais comum de todos, que é recadastrar um cliente que já
> está lá. Agora é 409 com a frase certa.
>
> **Máscara na digitação e na leitura**, com as duas funções em
> `lib/formato.ts`, junto do resto da formatação. Campo apagado vira `undefined`
> e não string vazia: `''` passaria pelo `@IsOptional` e gravaria vazio, que no
> índice único é um valor como outro qualquer e impediria a segunda empresa sem
> CNPJ.
>
> **A checagem do verificador foi reescrita, e a razão vale registrar.** Ela
> procurava os nomes `Matches|IsCnpj|validarCnpj|@Length(14)`, e o validador
> novo se chama `EhCnpj`: passaria a falhar por causa do NOME, não do estado.
> É a mesma armadilha do falso positivo do telefone em 09/08. Agora ela cobra
> duas coisas: o DTO chama um validador de CNPJ, e o validador contém a conta do
> dígito. Um `EhCnpj` que só medisse tamanho não passa.

`CreateEmpresaDto` valida CNPJ com `@IsOptional() @IsString()`. Sem formato, sem
dígito, sem unicidade, sem `@Transform` para aparar espaço (o DTO de usuário
tem, o de empresa não). Na tela aparece cru: `12345678000190`. Num CRM de
compliance, o CNPJ é o identificador legal do cliente.

**Critério de pronto:** `npm run entrega:check` passa em "CNPJ tem validação de
formato", e cadastrar duas empresas com o mesmo CNPJ é recusado.

### 28. turbopack.root fixado

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> **Uma linha, e o `npm run dev` voltou do 404.**
>
> `turbopack: { root: __dirname }` em `web/next.config.ts`. Sem ela o Turbopack
> descobre a raiz sozinho, subindo o disco até encontrar um lockfile, e adota a
> primeira pasta que tiver um. A documentação da versão instalada (Next 16.2.12,
> `turbopack.md`) diz isso com todas as letras e mostra o `root` como a saída
> para estrutura de projeto que não é workspace, que é o caso aqui.
>
> **Medido com o defeito no lugar, não com um lockfile de mentira.** O
> `package-lock.json` que o Opensquad criou em `/Users/nicolas` em 08/08 ainda
> está lá, então o cenário de falha estava montado. Antes: o servidor subia
> normal, o `proxy.ts` estourava `TypeError: adapterFn is not a function` e
> **toda página autenticada respondia 404**, só `/login` abria. Depois, com o
> mesmo lockfile no mesmo lugar:
>
> | Rota | Antes | Depois |
> |---|---|---|
> | `/login` | 200 | 200 |
> | `/membros` | **404** | 307 para `/login?de=%2Fmembros` |
> | `/dashboard`, `/projetos`, `/agenda`, `/` | **404** | 307 para o login |
>
> O 307 é o certo: é o proxy funcionando e guardando para onde a pessoa queria
> ir. Logada como a Coordenadora, `/membros` abre com as 8 linhas da lista.
>
> **O lockfile do Opensquad não foi apagado**, de propósito. Ele é de outro
> projeto do Nícolas e não cabe a este repositório mexer nele. E o conserto não
> depende disso: o ponto do `root` é que qualquer lockfile que apareça acima
> desta pasta, hoje ou daqui a um mês, deixa de importar.
>
> **`npm run build` conferido depois da mudança**, porque este arquivo também é
> o que a Vercel lê: as 16 rotas compilam e o `ƒ Proxy (Middleware)` aparece
> registrado na saída.

`next.config.ts` não fixa a raiz do workspace, então qualquer lockfile acima da
pasta do projeto faz o Turbopack eleger a pasta errada e toda página responde
500. Aconteceu em 08/08, quando o Opensquad criou um `package-lock.json` em
`/Users/nicolas`, e o `npm run dev` ficou quebrado sem ninguém perceber.

**Critério de pronto:** `npm run entrega:check` passa em "raiz do Turbopack
fixada", e `npm run dev` sobe com um `package-lock.json` de mentira criado em
`/Users/nicolas` e apagado depois.

### 29. Nomes com espaço sobrando limpos **(parada)**

**Bloco:** 4 · **Depende de:** 6 · **Estado:** **feito em 10/08/2026**

> **A varredura foi de tudo, não dos dois nomes que alguém notou.** A regra da
> classe do `CLAUDE.md` diz que defeito de padrão só fecha com varredura
> provando que sobrou zero, então o script olha TODO campo de texto de TODO
> model: **61 campos varridos**, em 15 tabelas.
>
> Achou exatamente os dois que o item registrava, e mais nada:
>
> ```
> User.nome: "Giovanna " -> "Giovanna"
> User.nome: "Erica "    -> "Erica"
> ```
>
> Medido depois, com leitura independente do script: **0 nomes diferentes do
> próprio `trim()`** na produção, e a varredura de 61 campos volta vazia. As duas
> linhas de auditoria saíram assinadas.
>
> **Por que só dois:** o DTO apara na entrada desde 05/08, então o defeito era
> só o que ficou gravado antes. O espaço vazava para onde o nome vira chave: o
> filtro de consultor da agenda e a carga por responsável do dashboard, onde
> "Giovanna " e "Giovanna" eram duas pessoas.
>
> **O que a varredura ensinou de brinde:** `Cargo.permissoes` é lista de texto e
> ficou de fora com um comentário explicando, porque `btrim` não recebe array e
> porque ali é constante do sistema, não texto digitado por gente. O primeiro
> ensaio quebrou nisso, e é a razão de o ensaio existir.
>
> Nasceu `prisma/aparar-nomes.ts` (`npm run nomes:aparar:producao`), com as
> mesmas quatro travas do script de contas, e com uma a mais que vale copiar: ao
> terminar, ele **refaz a varredura inteira** e só diz CONFERIDO se ela voltar
> vazia. A prova é a segunda medição, não a contagem do que ele achou que
> corrigiu.

O DTO já apara desde 05/08, mas os dois nomes gravados antes continuam errados
em produção: "Giovanna " e "Erica ". O espaço vazou para o filtro de consultor
da agenda e para a carga por responsável no dashboard.

Depende do item 6 para a correção ficar registrada na auditoria.

**Critério de pronto:** consulta de leitura na produção não devolve nenhum nome
diferente do seu próprio `trim()`.

---

# BLOCO 5: acabar o que está pela metade

### 30. Responsável do marco preenchível em tela

**Bloco:** 5 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> O campo existia no banco e no DTO desde sempre, e **nenhuma tela o
> preenchia**: os 8 responsáveis de produção tinham sido gravados por script.
>
> Agora ele está em dois lugares: no formulário de novo marco e na própria linha
> do marco, num seletor compacto ao lado do status. Trocar o dono não exige
> abrir formulário, porque é o campo que decide para quem o alerta de prazo vai.
>
> **A lista é a equipe do projeto, e isso é decisão.** Escolher qualquer pessoa
> da empresa exigiria `USUARIOS_READ`, que quem toca projeto nem sempre tem. É
> também a mesma escada da regra de destinatário: responsável do marco, senão a
> equipe.
>
> **Um defeito apareceu na primeira medição e foi consertado junto:** o marco
> "Mapeamento térmico" tinha dona no banco (Juliana) e a tela dizia "Sem
> responsável", porque ela não está na equipe do projeto e o `value` do seletor
> não casava com nenhuma opção. O navegador caía na primeira, e salvar qualquer
> outra coisa na linha teria apagado a dona de verdade. Quem está fora da equipe
> mas é o dono atual agora aparece como opção, marcado "(fora da equipe)".
>
> **Medido de ponta a ponta, na tela:**
>
> | Passo | Resultado |
> |---|---|
> | criar marco pela tela com Diego escolhido | gravado com responsável Diego |
> | dashboard, "Carga por responsável" | Diego passou de 1 para 2 marcos abertos |
> | excluir o marco de teste | Diego voltou para 1 |
>
> O marco de teste foi apagado. O banco local voltou ao estado anterior,
> inclusive a dona original do "Mapeamento térmico".

`EtapaProjeto.responsavelId` existe no banco e no DTO, e **nenhuma tela permite
preenchê-lo**. Os 8 responsáveis que existem em produção foram gravados por
script. O bloco "Carga por responsável" do dashboard depende exatamente disso.

**Critério de pronto:** `npm run entrega:check` passa em "responsável do marco
preenchível em tela", e criar um marco pela tela com responsável escolhido faz
o nome aparecer na carga por responsável.

### 31. Estado vazio com ação no bloco Equipe

**Bloco:** 5 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> O bloco aparece mesmo vazio, com a frase e o botão "Definir equipe".
>
> Escondido, projeto sem equipe parecia projeto sem o campo, e o único jeito de
> descobrir que dava para preencher era abrir a edição por acaso. Pior: **equipe
> vazia é justamente o estado que precisa ser visto**, porque é ele que faz o
> alerta de prazo cair no último recurso e ir para todo mundo que enxerga
> projetos. O texto do vazio diz isso, em vez de só dizer "nenhum registro".
>
> Conferido na tela, no projeto "Adequação BPF linha de sólidos", que não tem
> equipe: o bloco aparece com a frase e o botão.
>
> A checagem do verificador foi reescrita junto. Ela caçava o texto exato do
> `&&` que escondia o bloco, e passaria a acusar ou a perdoar por causa de uma
> refatoração de nome de variável. Agora mede a regra: existe a ação de definir
> equipe, e o bloco não está inteiro atrás de uma condição de tamanho.

O bloco Equipe da tela do projeto some por completo quando não há ninguém, e
some junto o caminho para atribuir. É o mesmo defeito que já foi corrigido no
bloco Descrição e não foi estendido aqui. Num CRM de compliance, projeto sem
ninguém responsável precisa parecer um problema, não parecer uma seção que você
não rolou até.

**Critério de pronto:** `npm run entrega:check` passa em "bloco Equipe aparece
mesmo vazio, com ação".

### 32. Executor de teste no front

**Bloco:** 5 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> **Vitest, e o fuso do executor é fixado em UTC.** Essa é a parte que importa:
> `TZ=UTC` é o oposto da máquina do Nícolas, e é exatamente onde o cálculo de
> dia civil quebrava. Rodar a suíte em `America/Sao_Paulo` esconderia o defeito
> que ela existe para pegar.
>
> Vitest e não Jest porque a `web/` é ESM e TypeScript puro, e o Vitest lê o
> mesmo tsconfig sem transpiler no meio. A API segue com Jest, que já vem
> pronto no NestJS.
>
> **Duas regras saíram de dentro de componente para poder existir teste:**
> `agruparPorUrgencia` (estava em `tarefas/page.tsx`) e `prazosPorDia` (estava
> dentro de um `useMemo` no `AgendaCalendar`). Dentro do componente elas só
> eram exercitadas abrindo a tela e olhando.
>
> **22 testes, cobrindo o que a fila pediu:**
>
> | O que | Casos |
> |---|---|
> | `diasAteOPrazo` com relógio em UTC, incluindo virada de dia e de mês | 6 |
> | `urgenciaDoPrazo`, na mesma régua de 15 dias do cron | 2 |
> | `formatarDataCivil`, `formatarMoeda`, CNPJ | 5 |
> | `agruparPorUrgencia` | 4 |
> | `prazosPorDia`, incluindo o filtro de empresa que o prazo ignorava | 5 |

A `web/` não tem nenhum teste e nem executor instalado. Toda a rede automatizada
do projeto está na API, enquanto a lógica de urgência, cálculo de dias,
formatação e filtro mora no front.

Cobertura mínima: agrupamento por urgência (`agrupar` em `tarefas/page.tsx`),
`diasAteOPrazo` e `urgenciaDoPrazo` incluindo a virada de dia em fuso diferente,
`formatarDataCivil`, e o filtro da agenda que faz o prazo respeitar empresa e
busca.

**Critério de pronto:** `npm run entrega:check` passa em "web: testes", e os
casos acima existem e passam.

### 33. e2e rodando ou removido

**Bloco:** 5 · **Depende de:** nada · **Estado:** **feito em 10/08/2026:
removido, com a condição de volta registrada**

> Saiu do repositório: `api/test/` inteiro, mais o script `test:e2e`.
>
> **Por que remover e não consertar.** O arquivo testava `GET /` respondendo
> "Hello World!", que é o único endpoint que não é do produto, e nunca rodava
> (o jest tem `rootDir: "src"`). Fazer ele rodar seria dar rede a um teste que
> não cobre nada.
>
> **E um e2e que valha a pena depende de outra coisa antes.** Ele sobe a API
> contra um banco de verdade, e para isso precisa de um banco descartável e já
> semeado, que é o item 10. Ligar um e2e com banco no verificador faria o
> `npm run entrega:check` falhar toda vez que o Postgres local estivesse
> desligado: alarme falso é como se desaprende a olhar para o verde.
>
> **A condição de volta, para não virar decisão esquecida:** quando o item 10
> entregar restauração testada em banco descartável, o e2e volta usando esse
> mesmo caminho, cobrindo login, uma rota por permissão e o cron.
>
> O `lint` e o `format` da API pararam de apontar para `test/`, que não existe
> mais.

`api/test/app.e2e-spec.ts` é o boilerplate do NestJS: testa se `GET /` responde
"Hello World!". O `jest` padrão tem `rootDir: "src"` e não o alcança, então ele
nunca roda. Ou vira teste de verdade e entra no verificador, ou sai do
repositório: arquivo de teste que ninguém executa dá falsa sensação de rede.

**Critério de pronto:** `npm run entrega:check` passa em "api: e2e alcançado por
algum comando", seja porque ele roda, seja porque não existe mais.

### 34. Tour guiado: relatado, sem construir

**Bloco:** 5 · **Depende de:** nada · **Estado:** **feito (relato)**

Varri `web/src` e `api/src` procurando `tour`, `onboarding`, `walkthrough`,
`driver.js`, `joyride`, `coachmark`, `intro` e "primeiros passos".

**Não existe nada.** Nenhum componente, nenhuma biblioteca, nenhum estado de
"primeira visita". Os únicos casos parecidos são os estados vazios das telas,
que explicam o que a tela faz e oferecem a primeira ação, e o texto de ajuda em
alguns formulários (por exemplo "O prazo alimenta o alerta automático de
compliance, disparado quando faltarem 15 dias").

Conforme combinado, **não foi construído**. Vira decisão do Nícolas depois desta
fila.

---

# BLOCO 6: cortar

**Só depois do Bloco 1 concluído.** Cortar tela antes de a promessa do produto
funcionar é arrumar a casa com o telhado aberto.

### 35. Esconder três blocos do dashboard

**Bloco:** 6 · **Depende de:** 1, 2, 3, 4 · **Estado:** **feito em 10/08/2026**

> Escondidos atrás de uma constante legível, `MOSTRAR_GRAFICOS_DE_VOLUME`, e
> não apagados: trocar para `true` devolve os três como estavam, sem
> arqueologia no histórico do git.
>
> O motivo de cada um, escrito no código: "Concentração por empresa" e
> "Projetos por estágio" são gráficos de 6 projetos, em que cada barra vale 1, e
> dão ar de relatório a um número que cabe na cabeça. "Marcos desta semana" era
> a **quarta** superfície a mostrar o mesmo prazo, junto do cartão "Marcos
> vencendo", do painel de alertas e do sino.
>
> **"Carga por responsável" fica**, pela decisão do item 37: o item 30 tornou o
> campo preenchível pela tela, então o número passou a ser mantido por quem usa.
>
> Conferido na tela, como CEO: dos quatro blocos, só "Carga por responsável"
> aparece.

Concentração por empresa, projetos por estágio e marcos desta semana. Os dois
primeiros são gráficos de 6 projetos, em que cada barra vale 1. O terceiro é a
quarta superfície a mostrar o mesmo prazo, junto do cartão "Marcos vencendo", do
painel de alertas e do sino.

Esconder, não remover: voltam sozinhos quando houver volume.

**Critério de pronto:** os três blocos não aparecem no dashboard e o código
segue no repositório atrás de uma condição legível.

### 36. Esconder Competências do menu

**Bloco:** 6 · **Depende de:** 1, 2, 3, 4 · **Estado:** **feito em 10/08/2026**

> Saiu do menu, e não do sistema. Conferido na tela: o menu passou a ter
> Dashboard, Empresas, Projetos, Agenda, Minhas tarefas, Membros e Cargos, e
> `/competencias` digitado no endereço continua respondendo 200.
>
> A condição de volta ficou escrita ao lado do item removido, no próprio
> `Sidebar.tsx`: quando a equipe passar de 10 pessoas, ou no primeiro dia em que
> alguém precisar perguntar quem sabe fazer o quê.

Produção tem **0 competências cadastradas, 0 vínculos com membro e 0
especialidades preenchidas**. A tela existe, é bem feita, e está vazia desde que
nasceu. Com 5 pessoas, quem sabe fazer o quê se sabe de cor.

Manter tela e API, tirar do menu. Volta quando a equipe passar de 10 pessoas ou
no primeiro dia em que alguém precisar perguntar.

**Critério de pronto:** o item some do menu para todos os cargos, e a rota
continua respondendo para quem digitar o endereço.

### 37. Carga por responsável: decidido pelo item 30

**Bloco:** 6 · **Depende de:** 30 e 35 · **Estado:** **decidido em 10/08/2026:
FICA**

> O item 30 foi feito, então a condição registrada aqui se cumpriu: o dado passa
> a ser mantido por quem usa, e o gráfico deixa de contar um campo que nenhuma
> tela preenche.
>
> **Conferido de onde o número sai:** `cargaPorConsultor` agrupa
> `EtapaProjeto` por `responsavelId`, com `status != CONCLUIDA`. É exatamente o
> campo que o item 30 tornou preenchível. Medido na mesma sessão: criar um marco
> pela tela com responsável escolhido moveu a barra da pessoa no dashboard, e
> excluir o marco moveu de volta.

**Fica** se o item 30 estiver feito, porque aí o dado passa a ser mantido por
quem usa. **Sai** se o item 30 não tiver sido feito, porque um gráfico que conta
um campo que nenhuma tela preenche é um número que envelhece sozinho.

**Critério de pronto:** a decisão está tomada e registrada aqui, com o motivo.

### 38. Limit fixo do KanbanBoard: registrado, sem gastar tempo

**Bloco:** 6 · **Depende de:** nada · **Estado:** **feito (registro)**

`KanbanBoard.tsx:39` usa `?limit=${LIMITE_BOARD}` com `LIMITE_BOARD = 100`. É o
único `limit` fixo que sobrou depois da varredura de 04/08, e o próprio arquivo
o documenta como pendência.

**Só importa se Leads voltar ao menu.** Hoje a tela está fora do menu e a
produção tem 0 leads. Registrado aqui, sem trabalho agendado. O verificador
continua acusando de propósito, para o dia em que Leads voltar isso não passar
despercebido.

---

### 39. Include de relação com soft delete devolvia linha apagada

**Bloco:** 2 · **Depende de:** nada · **Estado:** **feito em 10/08/2026**

> **Item que nasceu de uma medição, e não de uma revisão de código.** Fazendo o
> item 30, excluí pela tela o marco de teste e ele continuou aparecendo na tela
> do projeto. O `DELETE` funcionou: a linha ficou com `excluidoEm` preenchido.
> Quem não filtrava era a leitura.
>
> **A causa vale guardar:** a extensão do Prisma que implementa o soft delete
> injeta `excluidoEm: null` na consulta DE CIMA. O que vem por `include` passa
> intocado, e `include: { interacoes: true }` não tem onde filtrar nada. Quem
> escreveu a extensão não errou; o que faltava era saber que ela não alcança
> relação incluída.
>
> **Varredura, porque é defeito de padrão:** quatro pontos, três serviços.
>
> | Onde | Relação | O que aparecia |
> |---|---|---|
> | `projetos.service` (findOne) | `etapas` | marco excluído na tela do projeto |
> | `projetos.service` (findOne) | `interacoes` | contato excluído no histórico |
> | `leads.service` (findOne) | `interacoes` | idem, na tela do lead |
> | `users.service` (4 consultas) | `competencias` | competência excluída colada no membro |
>
> Medido antes e depois no mesmo marco: antes o `GET /projetos/:id` devolvia
> duas etapas, uma delas com `excluidoEm` preenchido; depois devolve uma.
>
> Checagem nova no verificador, a de número 41: relação com soft delete incluída
> como `true` não passa. Ela pega o defeito na forma em que ele é impossível de
> consertar (`relacao: true` não tem onde pôr filtro), e não numa string
> específica.

### 40. Marca de tarefa na agenda tinha que abrir

**Bloco:** 4 · **Depende de:** nada · **Estado:** **feito em 10/08/2026** ·
**pedido do Nícolas no chat**

> A marca cinza da tarefa na grade do mês era um `<span>`: cabia uma linha, o
> título quase nunca cabia inteiro, e não abria nada. A pessoa via "Revisar
> procedimento d..." e não tinha como saber o que era sem sair da agenda. O
> prazo de projeto, ao lado, já era um link para o projeto desde antes; a
> tarefa não era clicável.
>
> Agora é botão e abre um painel de leitura com o título inteiro, a descrição,
> o status, o selo de prazo, o responsável, a data e o projeto vinculado, com
> link para ele.
>
> **O "+N tarefa(s)" também abre.** Era o único aviso de que existia mais coisa
> naquele dia, e era justamente o que não dizia o que era.
>
> **É só leitura, de propósito.** Mudar status, prazo ou responsável continua
> sendo da tela de tarefas: repetir isso aqui seria duas telas para manter no
> lugar de uma.
>
> **O que ficou de fora, e fica registrado:** só a visão de Mês mostra tarefa.
> Semana, Dia e Lista não mostram nenhuma, e isso já era assim antes deste
> pedido. Não entra aqui porque é outro trabalho, com outra decisão de desenho.

---

## Painel de estado

| # | Bloco | Item | Depende de | Estado |
|---|---|---|---|---|
| 1 | 1 | Notificação vira aviso de uma pessoa | | **feito** |
| 2 | 1 | Motor de envio de e-mail | | **esperando a chave** |
| 3 | 1 | Disparo diário por destinatário | 1, 2 | **feito (entrega depende da chave)** |
| 4 | 1 | SLA de ticket no mesmo disparo | 3 | **feito** |
| 5 | 1 | Verificação do domínio (Nícolas) | | aberto |
| 6 | 2 | Auditoria alcança User e Cargo | | **feito** |
| 7 | 2 | Código de convite deixa de ser texto puro | 6 | **feito** |
| 8 | 2 | Contas @teste.com saem do ar **(parada)** | 6, 7 | **feito no que foi decidido: 3 desativadas, 3 ficam por escolha** |
| 9 | 2 | Dado de demonstração separado do real | 8 | **feito** |
| 10 | 2 | Backup com rotina, cópia fora, restauração testada | 7 | aberto |
| 11 | 2 | Higiene de ambiente e endereços | | **feito** |
| 12 | 3 | Teste de tabela rota por permissão | | **feito (verde desde 13 e 15)** |
| 13 | 3 | Guarda em GET /cargos, mais rota enxuta para o seletor | 12 | **feito** |
| 14 | 3 | Telefone fechado em GET /users | 13 | **feito** |
| 15 | 3 | executar-agora exige escrita | 14 | **feito** |
| 16 | 4 | Gaveta do celular: transform e Esc | | **feito** |
| 17 | 4 | Typecheck da API no mesmo comando do lint | | **feito** |
| 18 | 4 | datetime-local padronizado | | **feito** |
| 19 | 4 | Content-Type fora dos GET | | **feito** |
| 20 | 4 | 401, 403 e 500 distintos e sem jargão | | **feito** |
| 21 | 4 | Alvos de toque de 36px | | **feito** |
| 22 | 4 | Membros não oferece o que dá 403 | | **feito** |
| 23 | 4 | Vocabulário do botão Evento | | **feito** |
| 24 | 4 | Dia civil no front | 32 | **feito** |
| 25 | 4 | Formatação de moeda centralizada | | **feito** |
| 26 | 4 | forbidNonWhitelisted | 12 | **feito** |
| 27 | 4 | CNPJ com máscara, dígito e unicidade | | **feito** |
| 28 | 4 | turbopack.root fixado | | **feito** |
| 29 | 4 | Nomes com espaço limpos **(parada)** | 6 | **feito** |
| 30 | 5 | Responsável do marco preenchível | | **feito** |
| 31 | 5 | Estado vazio com ação no bloco Equipe | | **feito** |
| 32 | 5 | Executor de teste no front | | **feito** |
| 33 | 5 | e2e rodando ou removido | | **feito (removido)** |
| 34 | 5 | Tour guiado: relatado, não existe | | **feito** |
| 35 | 6 | Esconder três blocos do dashboard | 1, 2, 3, 4 | **feito** |
| 36 | 6 | Esconder Competências do menu | 1, 2, 3, 4 | **feito** |
| 37 | 6 | Carga por responsável: decidir | 30, 35 | **decidido: fica** |
| 38 | 6 | Limit fixo do KanbanBoard: registrado | | **feito** |
| 39 | 2 | Include com soft delete devolvia linha apagada | | **feito** |
| 40 | 4 | Marca de tarefa na agenda abre para leitura | | **feito** |

**2 abertos, 37 fechados, 1 esperando o Nícolas.** Nenhum dos abertos é item de
código: dependem de decisão do Nícolas ou de acesso que só ele tem.

---

## Progresso do verificador

Uma linha por sessão. O número só sobe com medição, nunca com afirmação.

| Data | Passando | Total | O que entrou |
|---|---|---|---|
| 09/08/2026 | 8 | 32 | marco zero, antes de qualquer conserto |
| 09/08/2026 | 11 | 32 | item 1: destinatário, janela com vencido, mensagem sem contagem |
| 09/08/2026 | 12 | 32 | item 2: motor de e-mail instalado e testado (falta a chave para provar entrega) |
| 09/08/2026 | 14 | 33 | item 6: auditoria alcança User e Cargo, e uma checagem nova nasceu junto (credencial fora do log) |
| 09/08/2026 | 15 | 33 | item 7: convite guardado como hash. O número seria 16, mas uma checagem falso-positiva foi corrigida e voltou a falhar |
| 09/08/2026 | 20 | 37 | item 11: higiene de ambiente, mais 4 checagens novas (permissão dos .env e volta do start:dev) |
| 09/08/2026 | 23 | 39 | item 17: typecheck limpo e dentro do lint, nos dois projetos, mais 2 checagens novas |
| 09/08/2026 | **22** | 39 | item 12: o número CAIU de propósito. O teste de tabela nasceu falhando nos 3 buracos que os itens 13 e 15 vão fechar |
| 09/08/2026 | 25 | 39 | itens 13 e 15: os 3 buracos fechados, teste de tabela verde, e nasceu GET /cargos/atribuiveis (71 rotas) |
| 10/08/2026 | 26 | 39 | item 14: telefone sai de /users só para quem gerencia e para o dono, medido com dois tokens e nas duas telas |
| 10/08/2026 | 27 | 39 | item 28: raiz do Turbopack fixada. O `npm run dev` estava servindo 404 em toda página autenticada desde 08/08 |
| 10/08/2026 | 28 | 40 | item 3: o aviso diário existe e sai por pessoa, mais 1 checagem nova cobrando o laço entre cron e motor |
| 10/08/2026 | 30 | 40 | item 16: animação parou de decidir visibilidade, e a gaveta parou de entrar de fora da tela |
| 10/08/2026 | 31 | 40 | itens 18 e 23: nasce o CampoDataHora e some o último campo de data nativo, e o botão da agenda passa a dizer o que cria |
| 10/08/2026 | 33 | 40 | itens 19 e 25: cabeçalho só quando há corpo, preflight com cache de 2h, e moeda num lugar só |
| 10/08/2026 | 35 | 40 | itens 26 e 27: campo fora do DTO vira 400, e CNPJ passa a ter dígito verificador, máscara e conflito tratado |
| 10/08/2026 | 38 | 41 | itens 30, 31 e 39: marco ganha dono pela tela, bloco Equipe aparece vazio, e `include` para de devolver linha apagada (1 checagem nova) |
| 10/08/2026 | 40 | 41 | itens 32 e 24: o front ganha executor de teste rodando em TZ=UTC, e o cálculo de dia passa a ser civil de Brasília |
| 10/08/2026 | 42 | 43 | item 9: dado de demonstração deixa de ser contado como cliente, mais 1 checagem nova |
| 10/08/2026 | **41** | **42** | itens 20, 22, 33 e 40: erro sabe distinguir permissão de falha, Membros para de oferecer o que dá 403, o e2e de mentira sai, e a marca de tarefa abre. Só o limit fixo do item 38 segue vermelho, de propósito |
