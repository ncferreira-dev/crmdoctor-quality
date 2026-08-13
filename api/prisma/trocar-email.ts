// Troca o e-mail de contas que foram cadastradas com endereço provisório,
// deixando rastro na auditoria.
//
// POR QUE ISTO EXISTE. O item 8 do ENTREGA.md mediu que três contas ativas da
// produção são de PESSOAS DE VERDADE cadastradas com `@teste.com`: Giovanna,
// Erica e Aline, com 9 tarefas, 6 marcos e 14 visitas somadas entre elas. O
// endereço `@teste.com` não existe. Enquanto ele estiver lá, o aviso diário
// dessas três é montado, enviado e não chega em ninguém: de cinco contas
// ativas, três não conseguem receber nada, que é a promessa do produto
// falhando calada para a maioria da equipe.
//
// O próprio item 8 escreveu qual é o conserto: "é uma troca de e-mail, não uma
// desativação. Com os endereços reais em mãos isso é um comando." Este é o
// comando. Desativar não serve, porque levaria junto o acesso de quem trabalha;
// excluir a API recusa, porque o histórico está vinculado, e em compliance o
// histórico é o produto.
//
// Uso, na pasta api/ (ENSAIO por padrão, não escreve nada):
//   npm run email:trocar:producao -- --destino=<trecho-da-url> --como=<email> \
//     analista2@teste.com=giovanna@drquality.com.br
//
// Para escrever de verdade, acrescente --aplicar.
//
// CINCO TRAVAS, e cada uma existe por um motivo. As quatro primeiras são as
// mesmas de `desativar-contas.ts`, pelo mesmo raciocínio:
//
//   1. --destino é obrigatório e precisa aparecer dentro da DATABASE_URL. Quem
//      roda declara em qual banco acha que está mexendo, e o script confere.
//   2. --como=<email> é obrigatório: é a pessoa que responde pela ação, e é o
//      que vai para o audit_log.
//   3. Só o e-mail ANTIGO precisa terminar em @teste.com. Este script existe
//      para tirar endereço provisório do ar; apontar ele para uma conta real
//      precisa ser uma decisão nova, escrita em outro lugar.
//   4. Sem --aplicar ele só mostra o que faria.
//   5. O e-mail NOVO é conferido antes: formato válido, não pode ser
//      `@teste.com` de novo, e não pode já pertencer a outra conta. A coluna é
//      única no banco, então sem esta trava o script morreria no meio da lista,
//      com parte das trocas feitas e parte não.
//
// O QUE A TROCA NÃO QUEBRA, conferido no código antes de escrever isto: o JWT
// assina só `{ sub }`, e cargo, permissões e status saem do banco a cada
// request. Trocar o e-mail não derruba a sessão de ninguém nem mexe em senha. O
// que muda é o endereço de login: quem trocar precisa avisar a pessoa.

import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarExtensaoAuditoria } from '../src/prisma/prisma-audit.extension';
import { runWith } from '../src/common/context/request-context';

const SUFIXO_PROVISORIO = '@teste.com';

// Deliberadamente simples: o objetivo é pegar dedo escorregado (espaço no meio,
// arroba faltando, domínio sem ponto), e não validar RFC. Endereço que passa
// aqui e não existe no mundo é problema de quem digitou, e a checagem de
// verdade é o e-mail chegando.
const FORMATO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function argumento(prefixo: string): string | undefined {
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

interface Troca {
  de: string;
  para: string;
}

function lerTrocas(): Troca[] {
  return process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--') && a.includes('='))
    .map((par) => {
      const [de, para] = par.split('=');
      return {
        de: de.trim().toLowerCase(),
        para: (para ?? '').trim().toLowerCase(),
      };
    });
}

async function main() {
  const destino = argumento('--destino=');
  const como = argumento('--como=');
  const aplicar = process.argv.includes('--aplicar');
  const trocas = lerTrocas();

  if (!destino) {
    throw new Error(
      'Faltou --destino=<trecho-da-url>. Ele obriga quem roda a declarar em ' +
        'qual banco acha que está mexendo, e o script confere antes de tocar ' +
        'em qualquer linha.',
    );
  }

  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes(destino)) {
    throw new Error(
      `ABORTADO. Você declarou --destino=${destino}, e a DATABASE_URL carregada ` +
        'não contém esse trecho. Nada foi alterado.',
    );
  }

  if (!como) {
    throw new Error(
      'Faltou --como=<email>. É quem responde pela troca, e é o que vai para o ' +
        'audit_log. Troca de e-mail sem autor é meia auditoria.',
    );
  }

  if (trocas.length === 0) {
    throw new Error(
      'Informe pelo menos uma troca, no formato antigo@teste.com=novo@dominio.com',
    );
  }

  const semDestinatario = trocas.filter((t) => !t.para);
  if (semDestinatario.length > 0) {
    throw new Error(
      `ABORTADO. Estas trocas vieram sem o e-mail novo: ${semDestinatario
        .map((t) => t.de)
        .join(', ')}. O formato é antigo@teste.com=novo@dominio.com.`,
    );
  }

  const foraDaRegra = trocas.filter((t) => !t.de.endsWith(SUFIXO_PROVISORIO));
  if (foraDaRegra.length > 0) {
    throw new Error(
      `ABORTADO. Este script só troca o e-mail de conta ${SUFIXO_PROVISORIO}, e ` +
        `você pediu: ${foraDaRegra.map((t) => t.de).join(', ')}. Nada foi alterado.`,
    );
  }

  const novosInvalidos = trocas.filter(
    (t) => !FORMATO_DE_EMAIL.test(t.para) || t.para.endsWith(SUFIXO_PROVISORIO),
  );
  if (novosInvalidos.length > 0) {
    throw new Error(
      `ABORTADO. Estes e-mails novos não servem: ${novosInvalidos
        .map((t) => t.para)
        .join(', ')}. Precisam ter formato válido e não podem ser ` +
        `${SUFIXO_PROVISORIO} de novo. Nada foi alterado.`,
    );
  }

  const repetidos = trocas
    .map((t) => t.para)
    .filter((email, i, todos) => todos.indexOf(email) !== i);
  if (repetidos.length > 0) {
    throw new Error(
      `ABORTADO. O mesmo e-mail novo apareceu mais de uma vez: ${[
        ...new Set(repetidos),
      ].join(', ')}. A coluna é única, e duas pessoas não podem dividir um ` +
        'endereço. Nada foi alterado.',
    );
  }

  // O client estendido, e não o cru: é a extensão que escreve o audit_log.
  const base = new PrismaService();
  const prisma = base.$extends(
    criarExtensaoAuditoria(base as unknown as PrismaClient),
  );

  const autor = await prisma.user.findUnique({
    where: { email: como },
    select: { id: true, nome: true, email: true, ativo: true },
  });
  if (!autor || !autor.ativo) {
    throw new Error(
      `ABORTADO. A conta ${como} não existe neste banco ou está desativada, ` +
        'então ela não pode responder pela ação. Nada foi alterado.',
    );
  }

  console.log(
    `${aplicar ? 'MODO APLICAR' : 'ENSAIO'}: TROCAR E-MAIL${aplicar ? '.' : ', nada será escrito.'}`,
  );
  console.log(`Banco conferido: a URL contém "${destino}"`);
  console.log(`Quem assina: ${autor.nome} <${autor.email}>`);
  console.log('');

  // A conferência de colisão roda ANTES de qualquer escrita, sobre a lista
  // inteira. Deixar o banco recusar no meio do laço deixaria a produção com
  // parte das trocas feitas, que é o pior estado possível: nem antes, nem
  // depois, e ninguém sabe onde parou.
  const colisoes: string[] = [];
  for (const troca of trocas) {
    const ocupante = await prisma.user.findUnique({
      where: { email: troca.para },
      select: { nome: true, email: true },
    });
    if (ocupante) {
      colisoes.push(`${troca.para} já é de ${ocupante.nome.trim()}`);
    }
  }
  if (colisoes.length > 0) {
    throw new Error(
      `ABORTADO, antes de escrever qualquer coisa. ${colisoes.join('; ')}. ` +
        'Nada foi alterado.',
    );
  }

  const provisoriasAntes = await prisma.user.count({
    where: { email: { endsWith: SUFIXO_PROVISORIO } },
  });
  const auditAntes = await prisma.auditLog.count();
  console.log(`Contas com e-mail provisório antes: ${provisoriasAntes}`);
  console.log(`Linhas de auditoria antes: ${auditAntes}`);
  console.log('');

  let trocadas = 0;
  for (const troca of trocas) {
    const alvo = await prisma.user.findUnique({
      where: { email: troca.de },
      select: { id: true, nome: true, ativo: true },
    });

    if (!alvo) {
      console.log(`  ${troca.de}: NÃO EXISTE neste banco, pulado`);
      continue;
    }

    if (!aplicar) {
      console.log(
        `  ${troca.de} -> ${troca.para} (${alvo.nome.trim()}${alvo.ativo ? '' : ', conta desativada'})`,
      );
      continue;
    }

    // O `await` PRECISA estar dentro do callback do runWith. A PrismaPromise é
    // preguiçosa: escrito como `runWith(store, () => prisma.user.update())`, a
    // promessa nasce dentro do contexto e executa fora dele, a extensão lê
    // contexto vazio e grava `usuarioId` nulo sem erro nenhum. Custou três
    // linhas de auditoria sem autor na produção em 10/08/2026.
    await runWith({ usuarioId: autor.id }, async () => {
      await prisma.user.update({
        where: { id: alvo.id },
        data: { email: troca.para },
      });
    });
    trocadas += 1;
    console.log(
      `  ${troca.de} -> ${troca.para}: TROCADO (${alvo.nome.trim()})`,
    );
  }

  console.log('');
  const provisoriasDepois = await prisma.user.count({
    where: { email: { endsWith: SUFIXO_PROVISORIO } },
  });
  const auditDepois = await prisma.auditLog.count();
  console.log(`Contas com e-mail provisório depois: ${provisoriasDepois}`);
  console.log(`Linhas de auditoria depois: ${auditDepois}`);
  console.log('');

  if (!aplicar) {
    console.log('Ensaio: nada foi escrito. Repita com --aplicar para valer.');
    await base.$disconnect();
    return;
  }

  // A comparação é a última trava: se o previsto e o medido divergirem, quem
  // está lendo precisa saber na hora.
  const previstoProvisorias = provisoriasAntes - trocadas;
  const previstoAuditoria = auditAntes + trocadas;
  const bate =
    provisoriasDepois === previstoProvisorias &&
    auditDepois === previstoAuditoria;

  console.log(
    bate
      ? `CONFERIDO: ${trocadas} troca(s), e as duas contagens batem com o previsto.\n` +
          'AVISE AS PESSOAS: o endereço de login mudou. A senha continua a mesma ' +
          'e ninguém foi deslogado.'
      : `DIVERGIU. Previsto: ${previstoProvisorias} contas provisórias e ` +
          `${previstoAuditoria} linhas de auditoria. Medido: ${provisoriasDepois} e ` +
          `${auditDepois}. Pare e confira antes de rodar qualquer outra coisa.`,
  );

  await base.$disconnect();
  if (!bate) process.exit(1);
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
