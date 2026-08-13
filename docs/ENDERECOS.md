# Endereços do CRM Doctor Quality

Onde cada peça do sistema mora. **Nenhum segredo entra neste arquivo:** só
endereço público, nome de projeto e nome de painel. Senha, connection string e
chave de API vivem nos `.env` (fora do git) e nos painéis.

Este arquivo existe porque até 09/08/2026 o endereço da API de produção não
estava em lugar nenhum do repositório: ele só existia como variável de ambiente
no painel da Vercel. Se aquela conta se perdesse, ninguém saberia dizer onde a
API está no ar.

## No ar

| O que | Endereço | Onde se administra |
|---|---|---|
| Front | https://crm-doctorquality-web.vercel.app | Vercel, projeto `crm-doctorquality-web` |
| API | https://doctor-quality-doctor.ncydib.easypanel.host | EasyPanel |
| Saúde da API | https://doctor-quality-doctor.ncydib.easypanel.host/health | público, responde `{"status":"ok"}` |
| Vigia do cron | https://doctor-quality-doctor.ncydib.easypanel.host/health/cron | público, 200 se o cron rodou nas últimas 26h, 503 se parou |
| Código | github.com/ncferreira-dev/crmdoctor-quality | privado |
| Banco | Neon, projeto `crm-doctorquality`, branch `production` | Neon |

O front conversa com a API pela variável `NEXT_PUBLIC_API_URL`, configurada no
painel da Vercel. É a mesma URL da linha "API" acima.

## Branches do banco, e qual é qual

| Branch | Endpoint | O que é |
|---|---|---|
| `production` | `ep-sweet-salad` | o banco de verdade |
| `vercel-dev` | `ep-rapid-dew` | branch antiga, **credencial morta**, não usar |

O jeito rápido de saber em qual banco um comando vai bater é olhar o endpoint
no host da connection string: `sweet-salad` é produção, `rapid-dew` é a branch
morta, `localhost` é a sua máquina.

## Como conferir que a produção está viva, sem entrar em painel nenhum

Abra no navegador:

```
https://doctor-quality-doctor.ncydib.easypanel.host/health/cron
```

- `{"status":"ok","ultimaExecucao":"..."}` significa que a API está de pé **e**
  o vigia de prazos rodou. É o sinal verde.
- `503` com `"atrasado"` significa que a API está de pé mas o cron parou.
- Nada respondendo significa que o container não subiu.

## Deploy

O passo a passo está no `ENTREGA.md`, no item 3 da Parte 4 do
`CHECKUP-GERAL.md`. Em resumo: o front sai sozinho no `git push` para a `main`,
e a API precisa do botão **Implantar** no EasyPanel, que é onde as migrations
rodam.

### A janela entre os dois, e por que ela morde

**As duas metades do sistema não sobem juntas, e essa é a armadilha de operação
mais fácil de esquecer.** O `git push` acaba, a Vercel builda em ~30 segundos e
a produção passa a rodar o front NOVO contra a API VELHA, até alguém clicar em
Implantar. Escrito em 12/08/2026, quando a tela de Chamados subiu.

Na maior parte das mudanças isso não dá em nada. Dá em problema quando o front
novo passa a mandar um parâmetro que a API velha não conhece: o `ValidationPipe`
roda com `forbidNonWhitelisted` desde o item 26, então campo fora do DTO vira
**400**, e não um campo ignorado em silêncio. A tela inteira mostra erro, mesmo
com front e API cada um funcionando perfeitamente sozinho.

**Regra prática:** mudou DTO, parâmetro de busca ou rota da API, implante a API
**antes ou logo depois** do push, e não no dia seguinte. A ordem ideal é API
primeiro, porque API nova servindo front velho é compatível (o parâmetro novo
simplesmente não é pedido), e o contrário não é.

**Como conferir em 5 segundos, sem entrar em painel:** abra o CRM em produção e
vá em Chamados. Se a lista aparecer, a API está nova. Se aparecer a caixa de
erro, a API ainda é a velha e falta Implantar.
