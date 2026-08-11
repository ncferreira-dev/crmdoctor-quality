# Chaves pendentes

Credenciais que o sistema precisa e que só você pode buscar. Cada uma tem o
site, o caminho até a tela, o nome do botão, o que copiar e onde colar.

**Regra que vale para todas:** nunca cole uma chave no chat comigo, nem me
mande print do painel de Ambiente do EasyPanel, que imprime tudo. Chave vai
direto do painel para o arquivo.

---

## 1. Chave do Resend, para o sistema conseguir enviar e-mail

**Por que precisa.** O aviso de prazo de compliance existe e funciona, mas hoje
ele só aparece dentro do CRM, para quem abrir a tela. Sem esta chave, nada sai
do sistema. É o item 2 do `ENTREGA.md`, e ele destrava o item 3, que é o e-mail
diário.

**Quanto custa.** Nada. O plano gratuito do Resend cobre 3.000 e-mails por mês,
e nós vamos usar algo perto de 30 por dia no pior caso.

**Tempo.** Uns 5 minutos.

### Passo 1: criar a conta

1. Abra o navegador em **resend.com**
2. Clique em **Sign up**, no canto superior direito
3. Crie a conta com **o e-mail que você preferir**, e anote qual foi

   O endereço em si não importa; o que importa é lembrar dele. Enquanto o
   domínio `drquality.com.br` não estiver verificado (item 5, mais abaixo),
   o Resend usa o domínio de teste dele, e esse remetente **só entrega para o
   endereço dono da conta**. O e-mail de teste vai ter que ser mandado para
   esse endereço, e para nenhum outro: mandar para outro devolve um erro
   dizendo exatamente isso.

   Esta instrução já fixou um e-mail específico e estava errada. O Nícolas
   criou a conta com o e-mail do GitHub, o que funciona igual.

4. Confirme o e-mail de verificação que chegar na caixa de entrada

### Passo 2: gerar a chave

1. Já dentro do Resend, olhe o menu da esquerda
2. Clique em **API Keys**
3. Clique no botão **Create API Key**, no canto superior direito
4. Preencha:
   - **Name:** `crm-doctorquality`
   - **Permission:** deixe em **Sending access** (não precisa de Full access,
     e quanto menos poder a chave tiver, melhor)
   - **Domain:** deixe como está, em **All domains**
5. Clique em **Add**

**O que você deve ver:** uma janela com a chave, começando com `re_`, e um
botão de copiar ao lado.

**Copie agora.** Esta é a única vez que o Resend mostra a chave. Se fechar a
janela sem copiar, não tem como recuperar: você apaga e cria outra.

### Passo 3: colar no arquivo do seu Mac

1. Abra o **Finder**
2. Vá em **Área de Trabalho**, depois `Doctor Quality`, depois
   `crm-doctorquality`, depois `api`
3. O arquivo se chama **`.env.local`**. Ele começa com ponto, então pode estar
   escondido: se não aparecer, aperte **Command + Shift + Ponto** para o Finder
   mostrar arquivos ocultos
4. Abra com o TextEdit (clique com o botão direito, **Abrir com**, **TextEdit**)
5. Vá até o fim do arquivo e acrescente uma linha nova:

```
RESEND_API_KEY=cole-a-chave-aqui
```

6. Salve com **Command + S** e feche

**O que você deve ver:** o arquivo com uma linha a mais no fim, começando com
`RESEND_API_KEY=re_` e o resto da chave.

### Passo 4: me avisar

Escreva no chat **"chave colada"** e **qual e-mail é o dono da conta do
Resend**. Não cole a chave.

Eu rodo o teste, e ele manda um e-mail de verdade para esse endereço. Você abre
a caixa de entrada e me diz se chegou. Só aí o item 2 fecha: script dizendo
"enviado" não é prova de entrega.

### Passo 5: a mesma chave em produção, depois

Isso é para quando o item for para o ar, não agora.

1. Abra o painel do **EasyPanel**
2. Entre no serviço da **API**
3. Abra a aba **Ambiente**
4. Acrescente a variável `RESEND_API_KEY` com o mesmo valor
5. Clique em **Salvar** e depois em **Implantar**

**O que você deve ver no log:** a linha
`Motor de e-mail ligado, remetente ...`. Se aparecer
`MOTOR DE E-MAIL DESLIGADO`, a variável não chegou.

**Cuidado conhecido:** o painel de Ambiente do EasyPanel às vezes mostra o
valor antigo mesmo tendo gravado o novo. A verificação real é essa linha do
log, não o que a tela do painel exibe.

---

## 2. Verificação do domínio drquality.com.br no Resend

**PARADO POR DECISÃO DO NÍCOLAS, 11/08/2026.** Não está nos planos agora. O
passo a passo abaixo continua válido e correto: é só retomar quando for a hora.

**Descoberto ao tentar fazer:** o `drquality.com.br` **não é do Nícolas**. Está
registrado no Registro.br em nome do **Fabrício** desde 2017, e a conta
Hostinger do Nícolas só tem o `flauzino.tech`. Então quem executa os passos
abaixo é o Fabrício, ou o Nícolas depois de receber acesso à conta dele.

**Sem isso, o aviso diário não chega em ninguém da equipe:** com o domínio de
teste, o Resend só entrega para o e-mail dono da conta.

**Antes de tudo, uma correção.** Este arquivo mandava verificar
`doctorquality.com.br`, e esse domínio **não existe**. Conferido em 11/08/2026:
a consulta de DNS responde `NXDOMAIN`, que quer dizer "não registrado". O
domínio da empresa é **`drquality.com.br`**, sem o "octor", e é o que aparece no
próprio e-mail do Fabrício.

**O que o DNS do domínio verdadeiro diz hoje**, medido em 11/08/2026:

| Registro | Valor | O que significa |
|---|---|---|
| NS | `ns1.dns-parking.com`, `ns2.dns-parking.com` | o DNS é gerenciado na **Hostinger** |
| MX | `drquality-com-br.mail.protection.outlook.com` | o e-mail da empresa é **Microsoft 365** |
| A | `147.93.38.107` | o site está na Hostinger |

**A regra de ouro deste procedimento: NÃO MEXA NO REGISTRO MX.** Ele é o que
faz o e-mail da empresa chegar no Outlook de vocês. O Resend não precisa dele:
ele pede registros próprios, de tipos diferentes. Se algum passo mandar
substituir o MX, pare e me chame.

### Passo 1: pedir os registros ao Resend

1. No Resend, menu da esquerda, clique em **Domains**
2. Clique em **Add Domain**
3. Digite `drquality.com.br`
4. Em **Region**, escolha a mais perto (`São Paulo` se aparecer, senão
   `us-east-1`; isso não muda nada para nós)
5. Clique em **Add**

**O que você deve ver:** uma tabela com três ou quatro linhas, cada uma com
**Type**, **Name/Host** e **Value**. Elas são de dois tipos:

- Um ou dois **TXT**, para provar que o domínio é seu e assinar a mensagem
  (DKIM). O nome costuma começar com `resend._domainkey`
- Um **MX** com nome `send` e valor terminando em `amazonses.com`

**Esse MX não substitui o seu.** Repare no campo **Name**: ele é `send`, ou
seja, vale para `send.drquality.com.br`, um subdomínio. O MX do Outlook fica no
domínio raiz e não é tocado. Se o campo Name vier vazio ou com `@`, aí sim pare
e me chame.

### Passo 2: criar os registros na Hostinger

1. Abra **hpanel.hostinger.com** e entre na sua conta
2. No menu de cima, clique em **Domínios**
3. Clique em **drquality.com.br**
4. No menu da esquerda, clique em **DNS / Nameservers**
5. Você vai ver a lista de registros que já existem. **Não apague nenhum.**
6. Para cada linha da tabela do Resend, role até o formulário **Gerenciar
   registros DNS** e preencha:
   - **Tipo:** o que o Resend disser (TXT ou MX)
   - **Nome:** copie do campo Name do Resend. Se o Resend mostrar
     `resend._domainkey.drquality.com.br`, na Hostinger você digita só
     `resend._domainkey`, sem o domínio no fim
   - **Aponta para / Valor:** cole exatamente o que está no campo Value
   - **TTL:** deixe o padrão
   - **Prioridade** (só aparece no MX): copie o número que o Resend mostrar,
     normalmente `10`
7. Clique em **Adicionar registro**
8. Repita para cada linha da tabela

**O erro mais comum aqui** é colar o nome completo com o domínio no fim. A
Hostinger acrescenta o domínio sozinha, então `resend._domainkey.drquality.com.br`
digitado inteiro vira `resend._domainkey.drquality.com.br.drquality.com.br` e
nunca verifica.

### Passo 3: verificar

1. Volte ao Resend, na tela do domínio
2. Clique em **Verify DNS Records**

**O que você deve ver:** cada linha virando **Verified**, em verde. Pode levar
de 5 minutos a algumas horas, porque depende do DNS propagar. Se der erro na
primeira tentativa, espere e clique de novo antes de mexer em qualquer coisa.

### Passo 4: me avisar

Escreva **"domínio verificado"**. Eu confiro por fora com uma consulta de DNS,
acrescento a variável `EMAIL_REMETENTE` na produção e disparo o aviso diário
para valer, medindo quantos saíram e quantos foram recusados.

**Uma conta que vale saber antes:** mesmo com o domínio verificado, das 5
pessoas com prazo pendente hoje só **2 recebem** (você e o Fabrício). As outras
três são a Giovanna, a Erica e a Aline, cujo e-mail cadastrado é `@teste.com` e
não existe. Isso é o item 8, que você decidiu deixar como está.

---

## 3. Cópia do backup fora deste Mac

O backup da produção existe e funciona: hoje ele mora em
`~/Desktop/backups-crm/`. O que falta é ele existir em **outro lugar**, porque
um arquivo único num Mac único não é backup, é uma cópia com sorte.

O arquivo tem nome, telefone e hash de senha de 8 pessoas. Trate como senha.

### Passo 1: gerar o arquivo do dia

No Terminal, dentro da pasta `crm-doctorquality/api`:

```
npm run backup:producao -- ~/Desktop/backups-crm/backup-crm-$(date +%F).json
```

Ele imprime uma linha por tabela e termina com "Backup gravado em ...".
Se aparecer "ATENÇÃO: este banco não bate com o schema do repositório", o backup
está completo do mesmo jeito: o aviso é sobre migration que falta aplicar na
produção, e é assunto meu.

### Passo 2: subir para um lugar que não é este Mac

Escolha UM, e me diga qual:

- **Google Drive ou iCloud**: arraste o arquivo para uma pasta chamada
  `Backups CRM`. É o caminho mais curto e resolve hoje.
- **1Password ou Bitwarden**: anexe o arquivo a um item chamado "Backup CRM".
  É o mais seguro dos três, porque o arquivo fica criptografado.
- **Pen drive**: só vale se ele ficar fora do escritório.

O que NÃO serve: outra pasta deste Mac, e-mail para você mesmo, ou WhatsApp.

### Passo 3: a rotina, quando você escolher onde

Rodar o comando à mão toda semana funciona e ninguém faz. Existem dois caminhos
para ele rodar sozinho, e a escolha é sua porque muda o custo:

1. **Neon** (o banco): o próprio provedor guarda cópia contínua e permite voltar
   o banco para um instante do passado. É o backup de verdade, e é o que eu
   recomendo ligar primeiro. Precisa conferir se o seu plano inclui, e me dizer.
2. **Este script, agendado**: dá para agendar no seu Mac, mas ele só roda com o
   Mac ligado e acordado. Serve como segunda cópia, não como a principal.

Me diga qual dos dois e eu monto.

---

## Estado

| Chave | Para quê | Estado |
|---|---|---|
| `RESEND_API_KEY` | o sistema conseguir enviar e-mail | **esperando você** |
| Verificação do domínio | o e-mail chegar em quem não é você | depois do item 2 |
| Verificação do domínio | o aviso chegar na equipe | **de fora por decisão, 11/08** |
| Cópia do backup fora do Mac | o backup existir em mais de um lugar | **esperando você** |
| Onde a rotina de backup roda | não depender de alguém lembrar | **esperando sua escolha** |
