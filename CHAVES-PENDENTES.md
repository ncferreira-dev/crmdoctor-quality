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
3. Crie a conta com o e-mail **profissionalncferreira@gmail.com**

   Este e-mail importa. Enquanto o domínio `doctorquality.com.br` não estiver
   verificado (item 5, mais abaixo), o Resend só entrega para o endereço dono
   da conta. Se você criar a conta com outro e-mail, o teste vai falhar e o
   erro vai dizer exatamente isso.

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

Escreva no chat só isto: **"chave colada"**. Não cole a chave.

Eu rodo o teste, e o teste manda um e-mail de verdade para
`profissionalncferreira@gmail.com`. Você abre a caixa de entrada e me diz se
chegou. Só aí o item 2 fecha: script dizendo "enviado" não é prova de entrega.

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

## 2. Verificação do domínio doctorquality.com.br no Resend

**Isto é o item 5 do `ENTREGA.md`, e não é para agora.** Só faça depois que o
item 2 estiver fechado.

**Por que vai precisar.** Com a chave do passo 1, o sistema envia do domínio de
teste do Resend, e ele só entrega para o dono da conta. Ou seja: dá para provar
que o motor funciona, e não dá para avisar a Renata, o Diego ou o Fabrício.
Verificar o domínio é o que libera enviar para qualquer pessoa da equipe, com
remetente `@doctorquality.com.br`.

**A pergunta que decide se dá para fazer:** você controla o DNS de
`doctorquality.com.br`? Ou seja, consegue entrar em algum painel (Registro.br,
GoDaddy, Cloudflare, HostGator, ou onde o domínio foi comprado) e acrescentar
registros? Se a resposta for não, quem controla precisa fazer isso, e o caminho
é o mesmo.

**Caminho, quando for a hora:**

1. No Resend, menu da esquerda, clique em **Domains**
2. Clique em **Add Domain**
3. Digite `doctorquality.com.br` e clique em **Add**
4. O Resend mostra uma tabela com três ou quatro linhas, cada uma com **Type**,
   **Name** e **Value**. São registros de DNS
5. Abra o painel onde o domínio está registrado e crie cada um desses
   registros, copiando Type, Name e Value exatamente como estão
6. Volte ao Resend e clique em **Verify DNS Records**

**O que você deve ver:** cada linha da tabela virando **Verified**, em verde.
Pode levar de alguns minutos a algumas horas, porque depende do DNS propagar.

**Quando estiver verde, me avise.** Eu acrescento a variável `EMAIL_REMETENTE`
apontando para um endereço do domínio, e aí o aviso passa a chegar na equipe
inteira.

---

## Estado

| Chave | Para quê | Estado |
|---|---|---|
| `RESEND_API_KEY` | o sistema conseguir enviar e-mail | **esperando você** |
| Verificação do domínio | o e-mail chegar em quem não é você | depois do item 2 |
