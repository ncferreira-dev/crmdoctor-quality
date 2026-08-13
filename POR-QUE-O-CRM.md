# Por que este CRM existe, e o que nele se justifica

Escrito em 09/08/2026. Nada de código foi tocado nesta sessão.

Base do que está escrito aqui: `contexto-crm-doctor-quality.md`, o
`CHECKUP-GERAL.md` de hoje, o código do repositório, o backup da produção de
07/08 e uma passada tela por tela no sistema rodando local, logado como CEO.
**Só escrevi sobre função que abri e vi.**

---

## Veredito

**Tem função demais.** São 17 funções em produção para uma equipe de 5 pessoas
e 4 clientes ativos.

O núcleo do produto é pequeno e está certo: cliente, projeto, marco com prazo,
e um aviso que dispara antes do prazo vencer. Isso justifica existir. O resto
foi construído em volta antes de o núcleo terminar de funcionar.

A prova está no próprio banco de produção: Competências tem **zero** registro,
Leads tem **zero**, e das 15 visitas nenhuma foi marcada como realizada. Quatro
das cinco telas mais elaboradas do sistema não têm um único dado que alguém
tenha colocado ali para trabalhar.

E a função que sozinha justifica o produto, o alerta de prazo, é justamente a
única que hoje não chega a ninguém.

---

## PARTE 1: por que o sistema existe

O que a Doctor Quality vende é conformidade com a ANVISA para empresas de
farma, cosmético, hospitalar, logística e laboratório. O trabalho tem duas
metades, e as duas estão no `contexto`: **adequar**, que é achar o que está
fora da norma e corrigir, e **comprovar**, que é deixar documentado, porque na
fiscalização não vale dizer que faz certo, tem que mostrar o papel.

A característica que decide tudo: em compliance quase tudo tem data limite.
Registro que vence, licença a renovar, auditoria com data marcada, dossiê a
entregar. Perder a data não é atraso, é o cliente ficar irregular, sujeito a
multa, interdição ou produto parado na fábrica.

Onde ela ganha dinheiro: entregando projetos de adequação dentro do prazo, e
sendo procurada de novo. **(suposição minha)** O modelo de cobrança é por
projeto com valor de contrato, porque `Projeto.valor` existe no banco e é campo
único por projeto, não recorrente.

Onde ela perde: um prazo que passa despercebido. O custo não é a hora
retrabalhada, é o cliente que fica irregular sob a guarda dela. Uma vez que
isso acontece, a consultoria contratada para garantir conformidade foi a que
deixou a conformidade cair. **(suposição minha)** Perde também no segundo
plano, quando alguém sai de férias e leva na cabeça o que foi combinado com o
cliente.

Tamanho real hoje: 8 contas, 4 cargos, 6 empresas (3 excluídas), 6 projetos.
**Duas pessoas reais no sistema**, Nícolas e Fabrício; quatro analistas com
convite pendente e nunca entraram.

**Em uma frase, o que este sistema impede de acontecer:** que uma data limite
de um cliente chegue sem que ninguém da consultoria tenha sido avisado a tempo
de agir.

---

## PARTE 2: função por função

Regra deste bloco: nada é justificado pelo que faz. Só pelo que acontece na
operação quando não existe.

### 1. Cliente cadastrado (Empresas)

**A dor sem o sistema.** A lista de clientes vive numa planilha, e o contato de
cada um vive no celular de quem atendeu. Quando alguém pergunta quem é o
contato da Bombril, a resposta é "pergunta pro Fabrício".

**O custo de fazer assim.** O trabalho fica pendurado numa pessoa. Quando ela
está em reunião, de férias ou saiu da empresa, o cliente espera. E a planilha
tem duas versões: a compartilhada e a que alguém baixou e editou.

**O que o sistema muda.** Um lugar só onde cliente, contato e segmento existem,
e do qual projeto, visita, chamado e histórico penduram. É a âncora: sem ela,
nenhuma das outras funções tem em quem se apoiar.

**Quem usa.** Todos os cargos leem. Coordenador e acima cadastram e editam.

**Frequência (estimativa).** Leitura várias vezes por dia. Cadastro, quando
entra cliente novo, então poucas vezes por mês.

**Se ninguém preencher direito.** Vira uma lista de nomes sem contato, e a
pergunta "quem eu ligo nessa empresa" volta pro WhatsApp. Hoje o CNPJ entra sem
formato nenhum e sem validação, então já nasce como campo em que não dá para
confiar.

### 2. Projeto com prazo de compliance

**A dor sem o sistema.** Cada contrato vira uma aba de planilha, ou uma pasta
no Drive, com a data limite escrita em algum lugar dela. Saber quantos
contratos estão correndo e qual vence primeiro exige abrir tudo e comparar na
mão.

**O custo.** A data limite é o único número que importa, e ele fica enterrado
no meio de uma planilha que ninguém abre toda manhã. Quando abre, é porque já
lembrou. E lembrar é justamente o que falha.

**O que o sistema muda.** O prazo vira um campo de primeira classe, com selo
colorido por urgência em toda lista onde o projeto aparece, e é ele que
alimenta o alerta automático. A tela de Projetos abre com "3 prazos em risco"
no título.

**Quem usa.** Coordenador e Analista trabalham nele todo dia. CEO lê.

**Frequência (estimativa).** Consulta diária. Criação, uma ou duas por mês.

**Se ninguém preencher direito.** Projeto sem prazo não gera alerta nenhum, e o
sistema é honesto sobre isso: existe um cartão "Projetos sem prazo" no
dashboard justamente para essa lacuna aparecer. Mas ele mostra o número e não
leva a lugar nenhum útil.

### 3. Marcos de compliance dentro do projeto

**A dor sem o sistema.** O projeto tem uma data final, mas o trabalho tem
etapas com datas próprias: protocolo aprovado, corridas de validação,
relatório assinado. Sem lugar para elas, viram itens numa lista de tarefas
solta ou linhas numa planilha paralela.

**O custo.** O projeto parece no prazo até a última semana, quando se descobre
que a etapa do meio nunca andou. A entrega final depende de coisas que
venceram silenciosamente.

**O que o sistema muda.** Cada projeto tem marcos numerados, com prazo, status
e barra de progresso ("1 de 3 concluídos, 33%"). E marcos com prazo entram no
mesmo alerta automático do projeto, o que multiplica o valor do aviso: hoje
sete dos oito alertas gerados em produção vieram de marco, não de projeto.

**Quem usa.** Coordenador e Analista.

**Frequência (estimativa).** Alguns toques por semana por projeto ativo.

**Se ninguém preencher direito.** Fica um projeto com uma data só, e o sistema
volta a ser uma planilha com aviso. **E tem um buraco concreto:** o marco tem
campo de responsável no banco, mas **nenhuma tela permite preenchê-lo.** Os 8
responsáveis que existem em produção foram gravados por script. Ou seja, esse
campo não tem como ser mantido por quem usa o sistema.

### 4. Alerta de prazo (notificações)

**A dor sem o sistema.** Alguém precisa lembrar de olhar a planilha. Na
prática, o lembrete existe na cabeça de uma pessoa, ou num evento de Google
Agenda criado à mão que não se move quando o prazo muda.

**O custo.** É o custo que o produto inteiro existe para evitar: a data chega,
ninguém agiu, o cliente fica irregular.

**O que o sistema muda hoje.** Um serviço roda todo dia às 8h, procura projetos
e marcos que vencem nos próximos 15 dias e cria um aviso. O aviso aparece no
sino do cabeçalho e num painel no dashboard, com botão de dar baixa.

**Quem usa.** Todos os cargos com permissão de notificações, que hoje são
todos.

**Frequência (estimativa).** O serviço roda uma vez por dia. A leitura deveria
ser diária.

**Se ninguém preencher direito.** Aqui a pergunta é outra, porque este aviso
não depende de alguém alimentar: ele nasce do prazo. O problema é o inverso, e
é o mais grave do sistema.

**Esta função está quebrada, e é um defeito só, não quatro.** A tabela
`Notificacao` foi modelada como aviso **da empresa**, não como aviso **de uma
pessoa**. Dessa única decisão saem os quatro sintomas:

- Não tem destinatário. Nenhuma coluna diz de quem é o aviso, então ninguém é
  responsável por ele.
- A leitura é um booleano na própria linha. Uma pessoa marca como lida e o
  aviso some para todos, medido: marquei como CEO e sumiu para a Coordenadora e
  para o Analista.
- A mensagem grava o número de dias dentro do texto e um índice único impede
  regravar. Medido hoje: o dashboard diz "vence em 9 dias" ao lado de
  13/08/2026, e a tela do projeto diz "vence em 4 dias" para o mesmo marco.
- A janela é de hoje até hoje mais 15 dias, então **prazo que já venceu sai do
  alerta**. Dois projetos vencidos em produção não aparecem em lugar nenhum.

E, por cima disso, o aviso nunca sai do banco: não há e-mail, push nem webhook
em nenhum lugar da API.

**O conserto é um só:** refazer o módulo com destinatário, leitura por pessoa,
mensagem que guarda o fato (o prazo já está gravado em `dataReferencia`, a tela
calcula os dias), janela que inclui o vencido, e uma saída que chegue a um
humano fora da tela. Consertar os quatro sintomas separadamente é retrabalho
garantido.

**Um detalhe do banco que decide o desenho.** Se cada pessoa virar uma linha
de notificação, os dois índices únicos existentes
(`[projetoId, tipo, dataReferencia]` e `[etapaId, tipo, dataReferencia]`)
precisam passar a incluir o destinatário, o que exige derrubar e recriar
índice. Não perde dado, mas não é só acrescentar coluna. Se a notificação
continuar sendo uma linha e a **leitura** virar tabela própria
(notificação mais pessoa), aí sim é puramente aditiva e os dois índices ficam
intactos. A segunda forma é a que cumpre "uma migration aditiva" ao pé da
letra.

### 5. Chamados do cliente e prazo de resposta (Tickets)

**A dor sem o sistema.** O cliente manda a dúvida no WhatsApp de um consultor.
Ela é respondida ou não. Ninguém sabe quantas estão abertas, nem há quantos
dias, nem quais nunca foram respondidas.

**O custo.** A cobrança do cliente chega antes da resposta. E quando chega, a
consultoria não tem como dizer se demorou, porque não existe registro da hora
em que a dúvida entrou.

**O que o sistema muda.** Cada chamado tem título, descrição e prioridade, e a
prioridade define um prazo de primeira resposta: alta 2 horas, média 8, baixa
24. Quem não respondeu no prazo ganha o selo "Em atraso", e o dashboard conta
quantos estão nessa situação.

**Quem usa.** Coordenador e Analista respondem. CEO lê o número.

**Frequência (estimativa).** Depende do volume do cliente, mas com 4 clientes
ativos, poucas vezes por semana.

**Se ninguém preencher direito.** Vira o WhatsApp de novo, com o agravante de
existir uma tela mentindo que está tudo sob controle. **A produção já mostra
isso:** dos 5 chamados, 2 são lixo de teste ("Ticket teste", "que isso?"), 3
dos 5 nunca receberam primeira resposta, e o dashboard hoje anuncia "3 em
atraso". O número está certo e não significa nada.

**Ressalva honesta:** não há nenhum chamado real em produção. A dor é
verossímil, o uso ainda não existe.

**Atualização de 12/08/2026 (itens 41 e 42 do ENTREGA.md).** Duas coisas
mudaram desde este texto.

A primeira: **chamado ganhou tela própria**, em `/chamados`, com as visões Em
aberto, Em atraso, Resolvidos e Todos. Até aqui a função existia inteira no
servidor e não tinha porta: para ver um chamado era preciso saber de qual
empresa ele era, entrar nela e rolar até o fim. Isso muda o parágrafo acima
sobre o uso não existir: enquanto não havia onde olhar a fila, não havia como o
uso começar.

A segunda: **o número que este texto cita estava errado.** "O dashboard hoje
anuncia 3 em atraso, o número está certo e não significa nada" era gentil demais
com o sistema. O cartão contava também chamado já **resolvido** que nunca tinha
recebido o carimbo de primeira resposta, então ele nem certo estava, e discordava
em silêncio do aviso diário, que fazia a conta do jeito certo. Corrigido no item
42, com a definição de atraso passando a morar num lugar só.

### 6. Agenda e visitas

**A dor sem o sistema.** As visitas vivem no Google Agenda de cada consultor.
Quem quiser saber o que a equipe está fazendo na semana abre três agendas.

**O custo.** Visita marcada em cima de outra, cliente visitado duas vezes no
mês e outro nenhuma, e ninguém percebe até o cliente reclamar.

**O que o sistema muda.** Um calendário só, com quatro visões (mês, semana,
dia, lista), filtro por consultor, empresa e status, e busca. A visita carrega
empresa, projeto, consultor, início, fim, tipo de serviço e observações. E o
que o Google Agenda não faz: **o prazo de compliance do projeto e o prazo da
tarefa aparecem no mesmo calendário**, com desenho próprio.

**Quem usa.** Quem faz visita técnica, e quem monta a agenda deles.

**Frequência (estimativa).** Consulta diária de quem está em campo. Marcação,
algumas por semana.

**Se ninguém preencher direito.** Vira um calendário vazio ao lado de um Google
Agenda cheio, que é o pior dos dois mundos. **Sinal concreto de que isso já
está acontecendo:** das 15 visitas em produção, 13 estão como "Agendada" e 2
como "Confirmada". **Nenhuma foi marcada como realizada ou cancelada.**
Ninguém fecha o ciclo. O campo de status existe, ninguém usa.

### 7. Tarefas

**A dor sem o sistema.** O trabalho miúdo (ligar para a clínica, revisar o
contrato, separar documento) é combinado em conversa e some.

**O custo.** A coisa pequena que trava a grande. O relatório atrasa porque
faltou um laudo que alguém deveria ter pedido duas semanas antes.

**O que o sistema muda.** Uma lista pessoal agrupada por urgência (atrasadas,
para hoje, a caminho, sem prazo, concluídas), com conclusão por caixinha. Quem
pode ver membros ganha o modo "Da equipe", com recorte por projeto. Dá para
mandar tarefa para outra pessoa direto da tela de Membros. E a tarefa com prazo
aparece no calendário.

**Quem usa.** Todos os cargos que têm a permissão. Hoje, todos menos o
Consultor.

**Frequência (estimativa).** Diária para quem executa.

**Se ninguém preencher direito.** Vira uma lista de coisas velhas que ninguém
fechou, e aí ela passa a atrapalhar, porque abrir e ver 7 tarefas atrasadas
todo dia ensina a pessoa a ignorar a tela. Em produção há 11 tarefas, e as com
prazo mais antigo estão vencidas.

**Sobreposição que precisa ser dita:** tarefa e marco de compliance são a mesma
frase, "trabalho com prazo atribuído a alguém". O sistema separa por
consequência (o marco entra no alerta e no progresso do projeto, a tarefa não),
e explica isso no estado vazio. É uma distinção defensável, mas é uma
distinção que a equipe vai ter que aprender e sustentar.

### 8. Membros e acesso

**A dor sem o sistema.** Não existe "sem o sistema" aqui: é o que faz mais de
uma pessoa conseguir entrar.

**O custo de não ter.** Senha compartilhada, e quando alguém sai da empresa
ninguém troca nada.

**O que o sistema muda.** Cadastro de membro que gera um código de 8 dígitos
para a própria pessoa escolher a senha, porque ninguém define senha de outro.
Desativar corta o acesso no mesmo segundo, e isso eu medi: com o token na mão,
a requisição seguinte já responde "Conta desativada". Resetar acesso derruba a
sessão aberta.

**Quem usa.** CEO e Desenvolvedor.

**Frequência (estimativa).** Raro. Entrada e saída de pessoa.

**Se ninguém preencher direito.** Sobram contas ativas de gente que não
trabalha mais ali. **Já está acontecendo:** 6 das 8 contas de produção são
`@teste.com`, duas delas conseguem entrar agora.

### 9. Cargos e permissões

**A dor sem o sistema.** Todo mundo vê tudo.

**O custo.** O caso concreto que o próprio CEO levantou: o valor do contrato
não deve aparecer para quem toca o projeto. Numa planilha compartilhada isso é
tudo ou nada, e a saída vira uma segunda planilha escondida, que envelhece
diferente da primeira.

**O que o sistema muda.** 11 grupos de permissão escritos em português comum
("Ver valor de contrato", "Gerenciar membros"), e uma hierarquia por nível em
que ninguém mexe em cargo igual ou acima do seu. E o valor do contrato é
filtrado **na API**, não escondido na tela, então não adianta abrir o
inspecionar do navegador.

**Quem usa.** CEO e Desenvolvedor.

**Frequência (estimativa).** Quase nunca. Uma ou duas vezes por trimestre.

**Se ninguém preencher direito.** Os cargos ficam como nasceram, que é
exatamente onde estão. Nenhum cargo em produção foi editado pela tela desde a
criação, tirando a concessão do Financeiro.

### 10. Competências

**A dor sem o sistema.** Saber quem da equipe sabe fazer validação de limpeza.

**O custo.** Numa equipe de 40 pessoas, perder meia hora perguntando. Numa de
5, custo nenhum: você sabe de cor.

**O que o sistema muda.** Um cadastro de especialidades e caixinhas no perfil
do membro.

**Quem usa.** Ninguém, hoje.

**Frequência (estimativa).** Zero.

**Se ninguém preencher direito.** É o estado atual. **Produção tem 0
competências cadastradas, 0 vínculos com membro e 0 especialidades
preenchidas.** A tela existe, é bem feita, e está vazia desde que nasceu.

**Não consigo escrever a frase do "sem ele acontece o quê" para esta função com
uma equipe deste tamanho.** Isso é o sinal de que ela não se sustenta agora.

### 11. Histórico de contato (Interações)

**A dor sem o sistema.** A pergunta que aparece toda semana numa consultoria é
"o que a gente já falou com essa empresa", e a resposta mora na cabeça de quem
atendeu ou no WhatsApp de alguém. Quando essa pessoa entra de férias, a empresa
perde o histórico.

**O custo.** Reunião que recomeça do zero. Cliente repetindo o que já explicou.
E, no caso ruim, promessa feita por uma pessoa e desconhecida pela seguinte.

**O que o sistema muda.** Uma linha do tempo na empresa e outra no projeto,
separadas de propósito, com tipo (ligação, e-mail, WhatsApp, reunião, visita,
outro), data, quem registrou e o resumo.

**Quem usa.** Quem atende o cliente.

**Frequência (estimativa).** Deveria ser toda vez que se fala com o cliente,
então diária. É a função mais cara em disciplina do sistema inteiro.

**Se ninguém preencher direito.** Vira uma linha do tempo com três entradas de
abril e nada depois, o que é pior que não ter, porque dá a impressão de que o
cliente não foi contatado. **Em produção há 5 registros, e os 5 são do cenário
de demonstração. Nenhum contato real foi registrado.**

### 12. Funil comercial (Leads)

**A dor sem o sistema.** Acompanhar quem foi prospectado e em que pé está.

**O custo.** Real para quem faz venda ativa.

**O que o sistema muda.** Um quadro com seis colunas (novo, contato feito,
qualificado, proposta, ganho, perdido) e arrastar entre elas.

**Quem usa.** Ninguém. **A tela está pronta, funciona, e foi tirada do menu por
decisão de produto.** Só chega nela quem digitar o endereço.

**Frequência (estimativa).** Zero.

**Se ninguém preencher direito.** É o estado atual: **0 leads em produção.**

### 13. Painel inicial (Dashboard)

**A dor sem o sistema.** Abrir cinco telas para saber como está a semana.

**O custo.** Pequeno, hoje. Com 6 projetos, a tela de Projetos já responde
quase tudo, e ela mostra o selo de prazo em cada linha.

**O que o sistema muda.** Sete cartões (projetos em andamento, concluídos,
marcos vencendo, alertas não lidos, projetos sem prazo, tickets abertos,
visitas na semana), o painel de alertas, e quatro blocos analíticos:
concentração por empresa, carga por responsável, projetos por estágio e marcos
desta semana.

**Quem usa.** CEO, principalmente.

**Frequência (estimativa).** Uma vez por dia, ao abrir.

**Se ninguém preencher direito.** O dashboard não depende de alguém alimentar,
depende dos outros módulos estarem em dia. Se não estiverem, ele erra com
confiança, que é o pior jeito de errar.

**Sobreposição séria dentro da própria tela:** o mesmo prazo aparece em quatro
lugares (cartão "Marcos vencendo", painel "Alertas de compliance", bloco
"Marcos desta semana" e o sino no cabeçalho). Quatro superfícies para o mesmo
fato, com textos que já se contradizem.

**E um bloco que depende do que não funciona:** "Carga por responsável" conta
marcos por pessoa, mas o responsável do marco não pode ser definido em tela
nenhuma.

### 14. Perfil

**A dor sem o sistema.** Trocar a própria senha depender de outra pessoa.

**O custo.** Pequeno, mas é o tipo de coisa cuja ausência trava alguém num
sábado.

**O que o sistema muda.** A pessoa edita nome e telefone e troca a própria
senha, e a troca encerra as sessões abertas.

**Quem usa.** Todos.

**Frequência (estimativa).** Raríssimo.

**Se ninguém preencher direito.** Nada acontece. É função de infraestrutura.

### 15. Trilha de auditoria e exclusão reversível

**A dor sem o sistema.** Alguém apaga um projeto por engano e não há volta. Ou,
pior num contexto de compliance: o cliente pergunta quem mudou aquela data, e
ninguém sabe.

**O custo.** Perda de dado sem rastro, e a impossibilidade de responder uma
pergunta que uma fiscalização pode fazer.

**O que o sistema muda.** Nenhum "excluir" apaga de verdade: empresa, projeto,
ticket, tarefa, visita, marco e contato ganham data de exclusão e somem das
telas. Toda criação, alteração e exclusão grava um retrato antes e depois, com
quem fez.

**Quem usa.** Ninguém, porque **não existe tela para ler isso.** São 163
registros de auditoria em produção que só se alcança pelo banco.

**Frequência (estimativa).** Zero de leitura, contínuo de escrita.

**Se ninguém preencher direito.** Não se aplica, é automático. **Mas há um
buraco:** membro e cargo ficam de fora da trilha. Criar usuário, trocar o cargo
de alguém, conceder acesso ao valor de contrato ou desativar uma conta não
deixam nenhum registro. As duas entidades mais sensíveis são as únicas sem
rastro.

---

## PARTE 3: o teste do corte

A pergunta: se eu apagasse essa tela na segunda de manhã, o que aconteceria até
sexta?

| Função | Até sexta, se sumisse | Classificação |
|---|---|---|
| **Empresas** | Projeto, chamado, visita e histórico ficariam sem onde se pendurar. O sistema deixaria de fazer sentido no primeiro clique | **NÚCLEO** |
| **Projeto com prazo** | Some a razão de existir do produto. Voltaria para a planilha na mesma tarde | **NÚCLEO** |
| **Marcos de compliance** | O projeto viraria uma data só, e 7 dos 8 alertas gerados deixariam de existir | **NÚCLEO** |
| **Alerta de prazo** | Nada mudaria até sexta, porque hoje ele já não chega a ninguém. É NÚCLEO pelo que deveria ser, não pelo que é | **NÚCLEO, quebrado** |
| **Membros e acesso** | Ninguém entraria. Não é uma função, é a porta | **NÚCLEO** |
| **Perfil** | Ninguém trocaria a própria senha. Pequeno, mas trava | **NÚCLEO** |
| **Agenda e visitas** | As visitas voltariam para o Google Agenda até sexta, sem drama. O que se perde é o prazo do projeto aparecer no mesmo calendário | **APOIO** |
| **Tarefas** | O time voltaria para o combinado por mensagem. Perderia rastreio, não perderia a semana | **APOIO** |
| **Tickets e SLA** | Nada aconteceria, porque não há chamado real em uso. A dor é verossímil, o uso ainda não existe | **APOIO** |
| **Cargos e permissões** | Nada até sexta: nenhum cargo é editado há semanas. Mas sem ele o valor de contrato volta a ser visível para todos | **APOIO** |
| **Histórico de contato** | Nada, porque não há registro real nenhum. É a função de maior valor prometido e menor uso comprovado | **APOIO, em risco** |
| **Valor de contrato restrito** | O coordenador voltaria a ver quanto custa o contrato | **APOIO** |
| **Dashboard, os 7 cartões** | Perderia a visão de abertura. A tela de Projetos já mostra prazo em risco no título | **APOIO** |
| **Dashboard, blocos analíticos** | Ninguém notaria. São gráficos de 6 projetos, e um deles conta um campo que nenhuma tela preenche | **ENFEITE** |
| **Trilha de auditoria** | Ninguém notaria, porque não há tela para lê-la. Continua valendo escrever, mas hoje é seguro que ninguém sente falta | **ENFEITE, por ora** |
| **Competências** | Nada. Zero registro desde que nasceu | **PREMATURO** |
| **Funil comercial (Leads)** | Nada. Já está fora do menu e com zero registro | **PREMATURO** |

### Sobreposição: duas funções resolvendo a mesma coisa

1. **Quatro superfícies para o mesmo prazo.** Cartão "Marcos vencendo", painel
   "Alertas de compliance", bloco "Marcos desta semana" e o sino. Todas dizem a
   mesma coisa, e já se contradizem entre si na tela.
2. **Tarefa e marco.** Os dois são trabalho com prazo e dono. A regra que os
   separa está escrita no estado vazio da tela de Tarefas, o que é bom, mas é
   uma regra que a equipe precisa decorar.
3. **Ticket e interação.** Os dois registram que o cliente falou com a
   consultoria. Um é demanda com prazo, o outro é memória. Na hora de registrar
   um WhatsApp do cliente pedindo um documento, não é óbvio qual dos dois usar,
   e a resposta errada some com a cobrança ou com o histórico.
4. **"Próxima visita" na tela da empresa e a Agenda.** Duplicação leve e útil.

### Função que existe só porque "CRM tem que ter"

- **O funil de leads.** É o quadro clássico de todo CRM. Foi construído
  primeiro, no papel de módulo de referência do código, e a decisão de produto
  já o tirou do menu. Continua no repositório inteiro.
- **Os blocos analíticos do dashboard.** Concentração por empresa e projetos
  por estágio são gráficos porque dashboard tem gráfico. Com 6 projetos, cada
  barra vale 1.

### Função que depende de outra que ainda não funciona

- **"Carga por responsável"** depende do responsável do marco, que **nenhuma
  tela consegue preencher**.
- **O painel de alertas e o sino** dependem de o alerta chegar a alguém, o que
  hoje não acontece fora da tela.
- **Competências** só valem se alguém as mantiver, e ninguém cadastrou nenhuma.
- **Documento da visita** existe no banco (`documentoUrl`), não tem campo em
  formulário nenhum, e está vazio nas 15 visitas.

### Função que exige disciplina que uma equipe pequena não vai ter

Em ordem de risco:

1. **Histórico de contato.** Exige registrar toda ligação e todo WhatsApp.
   Evidência: 5 registros, todos de demonstração.
2. **Competências.** Exige cadastrar e manter. Evidência: zero.
3. **Ciclo de vida da visita.** Exige voltar depois e marcar como realizada.
   Evidência: 15 visitas, nenhuma realizada.
4. **Ciclo de vida do chamado.** Exige responder e mudar status. Evidência: 3
   de 5 nunca receberam primeira resposta.

O padrão é o mesmo nos quatro: **o sistema é bom em capturar o começo de uma
coisa e ninguém volta para fechar.** Isso não se resolve com tela melhor. Ou o
fechamento vira consequência de outra ação que a pessoa já faz, ou a informação
não vai existir.

---

## PARTE 4: o que planilha e WhatsApp não fazem

Aqui está a resposta mais desconfortável do documento, e vou dar ela direto: **a
lista é curta. São quatro coisas.**

1. **Disparar sozinho.** Planilha não avisa ninguém. Google Agenda avisa, mas
   só do evento que alguém criou à mão, e ele não se move quando o prazo do
   projeto muda. Um serviço que todo dia às 8h olha todos os prazos de todos os
   projetos e marcos, e avisa sem ninguém pedir, é coisa que a combinação
   planilha mais WhatsApp mais Google Agenda não faz de jeito nenhum.
2. **Mostrar coisas diferentes para pessoas diferentes, no mesmo dado.** O
   coordenador toca o projeto e não vê o valor do contrato. Em planilha
   compartilhada isso é tudo ou nada, e a saída de sempre é uma segunda planilha
   que envelhece diferente da primeira.
3. **Cortar o acesso na hora.** Desativar alguém e a requisição seguinte dele
   já falhar. Em planilha você remove o compartilhamento e a cópia baixada
   continua no computador da pessoa; no WhatsApp o histórico fica no celular
   dela para sempre.
4. **Guardar quem mudou o quê e quando, sem depender de alguém anotar.** Num
   negócio cuja entrega é "comprovar", isso é matéria-prima. Planilha tem
   histórico de versão do Google, que ninguém consegue ler como resposta a uma
   pergunta; WhatsApp não tem nada.

**E só.** Tudo o mais que este sistema faz, uma planilha bem feita faz com mais
ou menos trabalho: lista de clientes, lista de projetos com data, quem está
responsável, quantos chamados abertos, calendário de visitas, histórico de
contato numa aba.

Três observações que essa lista curta obriga a fazer:

- **Dos quatro itens, o primeiro é o que justifica o produto, e é o único que
  hoje não funciona.** Enquanto o alerta não sair da tela, o sistema entrega
  três vantagens de infraestrutura e nenhuma vantagem de operação.
- **O item 4 existe no banco e não existe na tela.** Não há como ler a trilha
  de auditoria pelo sistema. Ela é uma vantagem real que hoje ninguém consegue
  usar.
- **A lista ser curta não significa que o sistema não vale.** Significa que o
  valor está concentrado em pouca coisa, e que cada tela fora dessas quatro
  precisa se justificar sozinha, porque não herda justificativa do resto.

---

## PARTE 5: recomendação de escopo

### MANTER

| Função | Por quê, em uma linha |
|---|---|
| Empresas | É a âncora: sem ela nenhuma outra função tem onde se pendurar |
| Projeto com prazo de compliance | É o motivo de o produto existir |
| Marcos dentro do projeto | Geram 7 dos 8 alertas, e são onde o trabalho realmente vence |
| Alerta de prazo, **refeito** | Sem ele o sistema é uma planilha bonita |
| Agenda e visitas | Único lugar onde visita e prazo do cliente aparecem juntos |
| Tarefas | O trabalho miúdo é o que trava a entrega grande |
| Membros e acesso | É a porta, e desativar corta o acesso na hora |
| Perfil | Trocar a própria senha não pode depender de outra pessoa |
| Cargos e permissões | É o que faz o valor do contrato ficar restrito de verdade |
| Valor de contrato restrito | Pedido explícito do CEO, e feito no lugar certo |
| Tickets e SLA | Mantenho. Em 12/08/2026 ganhou tela própria e saiu da observação: a função não tinha porta, e função sem porta não tem como ser usada |

### CORTAR OU ESCONDER AGORA

| Função | O que se perde | Como |
|---|---|---|
| **Competências** | Nada hoje. Zero registro desde que nasceu | **Esconder do menu.** A tela e a API ficam. Em compliance a regra é desativar, não excluir, e aqui não há nem dado a preservar |
| **Funil comercial (Leads)** | Nada. Já está fora do menu | **Manter escondido, e assumir.** Vale registrar por escrito que é código parado, para ninguém achar que é dívida a pagar |
| **Blocos analíticos do dashboard** (concentração por empresa, projetos por estágio) | Dois gráficos de 6 projetos, em que cada barra vale 1 | **Esconder da tela.** Voltam sozinhos quando houver volume |
| **Bloco "Carga por responsável"** | Um gráfico que conta um campo que nenhuma tela preenche | **Esconder até o responsável do marco existir em tela.** Hoje ele exibe um dado que ninguém consegue manter |
| **Bloco "Marcos desta semana"** | A quarta cópia do mesmo prazo | **Esconder.** O painel de alertas e o sino já dizem isso |
| **Campo "documento" da visita** | Nada. Existe no banco, não existe em formulário, está vazio nas 15 visitas | **Deixar quieto no banco, sem tela.** Remover coluna é migration destrutiva por nada |

Nenhum destes é remover de vez. Todos são esconder ou desativar.

### GUARDAR PARA DEPOIS

| Função | Gatilho que a traz de volta |
|---|---|
| **Competências** | Equipe passar de 10 pessoas, **ou** o primeiro dia em que alguém precisar perguntar quem sabe fazer determinado serviço |
| **Funil comercial (Leads)** | A decisão de produto mudar e a venda ativa começar. Não é falta de tempo, é ordem de prioridade |
| **Converter lead em cliente** | Junto com o item acima. A rota existe e nunca teve tela |
| **Blocos analíticos** | Passar de 20 projetos ativos, quando a barra deixar de valer 1 |
| **Carteira própria (cada um vê só o seu)** | Passar de 10 pessoas em campo. Hoje todo mundo vê tudo e ninguém reclamou |
| **Tela para ler a trilha de auditoria** | O primeiro cliente ou fiscalização perguntar quem alterou determinado dado |
| **Auditoria de membro e cargo** | Antes de entrar o primeiro cliente pagante. É a única lacuna desta lista que eu trataria como pendência, e não como futuro |

---

## PARTE 6: versão para o cliente

Sem uma palavra técnica. Um parágrafo por função, do ponto de vista de quem vai
usar.

### O que faz parte do sistema entregue

**Seus clientes num lugar só.** Cada empresa atendida tem uma ficha com o
contato, o segmento e tudo o que já aconteceu com ela. Quando alguém precisa
falar com um cliente, não precisa perguntar a ninguém quem é o contato.

**Cada trabalho com a sua data limite.** Todo projeto tem uma data que não pode
passar, e ela fica à vista em toda tela onde o projeto aparece, com uma marca
que muda de cor conforme o prazo aperta. A lista de projetos abre já dizendo
quantos estão em risco.

**As etapas dentro do trabalho.** Um projeto não vence só no fim: ele tem
etapas com datas próprias, e cada uma delas fica registrada com o seu prazo e
o seu andamento, com uma barra mostrando quanto já foi entregue. É aqui que se
descobre que a etapa do meio parou, em vez de descobrir na última semana.

**Um aviso antes do prazo chegar.** Todo dia de manhã o sistema olha sozinho
todas as datas e avisa das que estão chegando, sem ninguém precisar lembrar de
conferir. Este é o coração do sistema. **Hoje o aviso aparece dentro do
sistema, para quem abrir a tela. Fazer o aviso sair daqui e chegar até a pessoa
por fora é a próxima entrega, e a mais importante.**

**Os pedidos do cliente com hora marcada para responder.** Quando o cliente
pede alguma coisa, isso vira um chamado com prioridade, e cada prioridade tem
um tempo de resposta combinado. Quem passou do tempo aparece marcado. Deixa de
existir "achei que alguém tinha respondido".

**A agenda da equipe.** Todas as visitas da equipe num calendário só, com filtro
por pessoa, por cliente e por situação. E no mesmo calendário aparecem as datas
limite dos projetos e os prazos das tarefas, o que nenhuma agenda comum mostra
junto.

**A lista do que cada um tem para fazer.** As tarefas de cada pessoa,
organizadas por urgência em vez de por tipo: o que está atrasado primeiro, o
que é para hoje depois. Quem coordena consegue ver o da equipe e mandar tarefa
para alguém.

**Quem entra e o que cada um enxerga.** Cada pessoa tem o seu acesso, e cada
cargo enxerga uma parte do sistema. O valor dos contratos, por exemplo, só
aparece para quem tem essa permissão, mesmo que a pessoa toque o projeto todo
dia. Quando alguém sai da empresa, o acesso é cortado na mesma hora, não no dia
seguinte.

**Sua própria conta.** Cada pessoa escolhe a própria senha, e ninguém escolhe a
senha de ninguém. Quem esquece recebe um código novo e cria outra.

**Nada some por engano.** Quando alguém apaga alguma coisa, ela sai da tela mas
continua guardada, e o sistema registra o que era antes, o que virou e quem
mexeu.

### O que é melhoria contínua, que evolui com o uso

**O histórico de conversas com o cliente.** A ideia é que toda ligação, e-mail
ou reunião fique registrada na ficha do cliente, para que a memória do
relacionamento não dependa de quem atendeu. Isso só funciona se a equipe pegar
o hábito de registrar, então é uma função que cresce com o uso e não nasce
pronta.

**O painel de abertura.** A tela inicial mostra o resumo da operação, e ela vai
ficar mais útil conforme houver mais clientes e mais projetos. Com o volume de
hoje, a lista de projetos já responde quase tudo o que ela responde.

**O cadastro de especialidades da equipe.** Serve para saber quem sabe fazer o
quê. Faz diferença quando a equipe cresce; com o time atual, todo mundo já sabe
de cor, então está guardado para quando fizer falta.

**O acompanhamento de novos clientes em prospecção.** A parte do sistema que
acompanha quem ainda não é cliente está construída, mas desligada por decisão
de prioridade: primeiro o atendimento de quem já é cliente, depois a busca por
novos.

---

## Tabela única

| # | Função | Existe na tela | Uso real em produção | Classificação | Recomendação |
|---|---|---|---|---|---|
| 1 | Empresas | sim | 6 empresas, 3 excluídas | NÚCLEO | manter |
| 2 | Projeto com prazo de compliance | sim | 6 projetos | NÚCLEO | manter |
| 3 | Marcos de compliance | sim | 9 marcos, 8 com responsável gravado por script | NÚCLEO | manter, e criar campo de responsável na tela |
| 4 | Alerta de prazo (sino e painel) | sim | 8 avisos, todos lidos | NÚCLEO, quebrado | refazer como um módulo só |
| 5 | Membros e acesso | sim | 8 contas, 6 são de teste | NÚCLEO | manter, e limpar as contas de teste |
| 6 | Perfil e troca de senha | sim | n/a | NÚCLEO | manter |
| 7 | Agenda e visitas | sim | 15 visitas, nenhuma marcada como realizada | APOIO | manter |
| 8 | Tarefas | sim | 11 tarefas | APOIO | manter |
| 9 | Tickets e prazo de resposta | sim | 5 chamados, 2 são lixo de teste, 3 sem resposta | APOIO | manter em observação |
| 10 | Cargos e permissões | sim | 4 cargos, nunca editados pela tela | APOIO | manter |
| 11 | Valor de contrato restrito | sim | concedido a 2 cargos | APOIO | manter |
| 12 | Histórico de contato | sim | 5 registros, todos de demonstração | APOIO, em risco | manter e reavaliar em 30 dias |
| 13 | Dashboard, os 7 cartões | sim | n/a | APOIO | manter |
| 14 | Dashboard, concentração por empresa | sim | 6 projetos, cada barra vale 1 | ENFEITE | esconder |
| 15 | Dashboard, projetos por estágio | sim | idem | ENFEITE | esconder |
| 16 | Dashboard, carga por responsável | sim | campo que nenhuma tela preenche | ENFEITE | esconder até o campo existir |
| 17 | Dashboard, marcos desta semana | sim | quarta cópia do mesmo prazo | ENFEITE | esconder |
| 18 | Trilha de auditoria e exclusão reversível | **não tem tela** | 163 registros, ilegíveis pelo sistema | ENFEITE por ora, base depois | manter escrevendo, criar tela quando pedirem |
| 19 | Competências | sim | **0 registros, 0 vínculos** | PREMATURO | esconder do menu |
| 20 | Funil comercial (Leads) | sim, fora do menu | **0 registros** | PREMATURO | manter escondido |
| 21 | Documento da visita | **não tem campo** | 0 de 15 preenchidos | PREMATURO | deixar no banco, sem tela |

**Contagem:** 6 núcleo, 7 apoio, 5 enfeite, 3 prematuro. Das 21 linhas, **8
podem sair da frente da equipe hoje** sem que ninguém sinta falta até sexta.

---

## Anexo: o que sustenta cada afirmação de uso

Os números de "uso real" vêm do backup da produção de 07/08/2026, e merecem uma
ressalva de honestidade: **parte da produção é um cenário de demonstração
montado de propósito**, não uso orgânico. Separando pelo arquivo
`docs/demo-producao-ids.json`:

| Tabela | Total | Do cenário de demonstração | Fora dele |
|---|---|---|---|
| Empresas | 6 | 2 | 4 |
| Projetos | 6 | 4 | 2 |
| Marcos | 9 | 8 | 1 |
| Tickets | 5 | 3 | 2 (os dois são lixo de teste) |
| Visitas | 15 | 4 | 11 |
| Interações | 5 | **5** | **0** |
| Tarefas | 11 | 4 | 7 |
| Competências | 0 | 0 | 0 |
| Leads | 0 | 0 | 0 |

O que isso permite afirmar com segurança: **visitas e tarefas têm uso fora da
demonstração; interações, competências e leads não têm nenhum.**

O que isso **não** permite afirmar: que as funções sem uso não têm demanda. O
sistema tem duas pessoas reais dentro e nenhum cliente pagante usando. Ausência
de uso aqui é sinal fraco, não prova. Para Competências e Leads o sinal fraco
aponta na mesma direção de uma decisão que você já tinha tomado, e é por isso
que eu os classifico como prematuros, e não como erro.
