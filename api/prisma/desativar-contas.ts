// Desativa contas nomeadas, uma por uma, deixando rastro na auditoria.
//
// É o item 8 do ENTREGA.md. A regra do CRM é DESATIVAR, nunca excluir: conta
// desativada não loga, e todo o trabalho vinculado a ela (tarefa, marco, visita,
// equipe) continua existindo e continua atribuído. Excluir levaria o histórico
// junto, e em compliance histórico é o produto.
//
// Uso, na pasta api/ (ENSAIO por padrão, não escreve nada):
//   npm run contas:desativar -- --destino=<trecho-da-url> --como=<email> a@teste.com b@teste.com
//
// Para escrever de verdade, acrescente --aplicar.
//
// QUATRO TRAVAS, e cada uma existe por um motivo:
//
//   1. --destino é obrigatório e precisa aparecer dentro da DATABASE_URL. Quem
//      roda declara em qual banco acha que está mexendo, e o script confere.
//   2. --como=<email> é obrigatório: é a pessoa que responde pela ação, e é o
//      que vai para o audit_log. Sem autor, a trilha registra que a conta caiu e
//      não registra por ordem de quem, que é metade da auditoria.
//   3. Só e-mail que termina em @teste.com passa. Este script existe para
//      limpar conta de teste; apontar ele para uma conta real precisa ser uma
//      decisão nova, escrita em outro lugar.
//   4. Sem --aplicar ele só mostra o que faria. Escrever em produção não pode
//      ser o efeito de um comando digitado errado.

import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarExtensaoAuditoria } from '../src/prisma/prisma-audit.extension';
import { runWith } from '../src/common/context/request-context';

const SUFIXO_PERMITIDO = '@teste.com';

function argumento(prefixo: string): string | undefined {
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

async function main() {
  const destino = argumento('--destino=');
  const como = argumento('--como=');
  const aplicar = process.argv.includes('--aplicar');
  // Reativar existe pelo mesmo motivo que desativar: é a operação inversa da
  // mesma regra, com as mesmas travas. Nasceu em 10/08/2026 para consertar uma
  // trilha de auditoria escrita sem autor, e fica porque desfazer uma
  // desativação é coisa que se precisa fazer sem abrir o banco na mão.
  const reativar = process.argv.includes('--reativar');
  const alvos = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--'))
    .map((a) => a.trim().toLowerCase());

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
      'Faltou --como=<email>. É quem responde pela desativação, e é o que vai ' +
        'para o audit_log. Desativação sem autor é meia auditoria.',
    );
  }

  if (alvos.length === 0) {
    throw new Error('Informe pelo menos um e-mail para desativar.');
  }

  const forasDaRegra = alvos.filter((e) => !e.endsWith(SUFIXO_PERMITIDO));
  if (forasDaRegra.length > 0) {
    throw new Error(
      `ABORTADO. Este script só desativa conta ${SUFIXO_PERMITIDO}, e você ` +
        `pediu: ${forasDaRegra.join(', ')}. Nada foi alterado.`,
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
  if (alvos.includes(autor.email.toLowerCase())) {
    throw new Error(
      'ABORTADO. Você está tentando desativar a própria conta que assina a ' +
        'ação. Nada foi alterado.',
    );
  }

  const acao = reativar ? 'REATIVAR' : 'DESATIVAR';
  console.log(
    `${aplicar ? 'MODO APLICAR' : 'ENSAIO'}: ${acao}${aplicar ? '.' : ', nada será escrito.'}`,
  );
  console.log(`Banco conferido: a URL contém "${destino}"`);
  console.log(`Quem assina: ${autor.nome} <${autor.email}>`);
  console.log('');

  const antes = await prisma.user.count({ where: { ativo: true } });
  const auditAntes = await prisma.auditLog.count();
  console.log(`Contas ativas antes: ${antes}`);
  console.log(`Linhas de auditoria antes: ${auditAntes}`);
  console.log('');

  let desativadas = 0;
  for (const email of alvos) {
    const alvo = await prisma.user.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, ativo: true },
    });

    if (!alvo) {
      console.log(`  ${email}: NÃO EXISTE neste banco, pulado`);
      continue;
    }
    if (alvo.ativo === reativar) {
      console.log(
        `  ${email}: já estava ${reativar ? 'ativa' : 'desativada'}, pulado`,
      );
      continue;
    }

    if (!aplicar) {
      console.log(
        `  ${email}: seria ${reativar ? 'reativada' : 'desativada'} (${alvo.nome.trim()})`,
      );
      continue;
    }

    // runWith é o que dá autor à linha de auditoria: a extensão lê o usuário
    // atual do contexto, que numa requisição vem do JWT e aqui vem daqui.
    //
    // O `await` PRECISA estar dentro do callback, e isso custou três linhas de
    // auditoria sem autor na produção em 10/08/2026. `prisma.user.update()`
    // devolve uma PrismaPromise PREGUIÇOSA: a consulta só sai quando alguém
    // chama `.then()`. Escrito como `runWith(store, () => prisma.user.update())`,
    // a promessa nasce dentro do contexto e EXECUTA fora dele, porque o await
    // acontece depois que o runWith já voltou. A extensão então lê o contexto
    // vazio e grava usuarioId nulo, sem erro nenhum, que é o pior jeito de
    // errar.
    await runWith({ usuarioId: autor.id }, async () => {
      await prisma.user.update({
        where: { id: alvo.id },
        data: { ativo: reativar },
      });
    });
    desativadas += 1;
    console.log(
      `  ${email}: ${reativar ? 'REATIVADA' : 'DESATIVADA'} (${alvo.nome.trim()})`,
    );
  }

  console.log('');
  const depois = await prisma.user.count({ where: { ativo: true } });
  const auditDepois = await prisma.auditLog.count();
  console.log(`Contas ativas depois: ${depois}`);
  console.log(`Linhas de auditoria depois: ${auditDepois}`);
  console.log('');

  if (!aplicar) {
    console.log('Ensaio: nada foi escrito. Repita com --aplicar para valer.');
    await base.$disconnect();
    return;
  }

  // A comparação é a última trava: se o previsto e o medido divergirem, quem
  // está lendo precisa saber na hora, e não no dia em que faltar alguém.
  const previstoAtivas = reativar ? antes + desativadas : antes - desativadas;
  const previstoAuditoria = auditAntes + desativadas;
  const bate = depois === previstoAtivas && auditDepois === previstoAuditoria;

  console.log(
    bate
      ? `CONFERIDO: ${desativadas} ${reativar ? 'reativação(ões)' : 'desativação(ões)'}, e as duas contagens batem com o previsto.`
      : `DIVERGIU. Previsto: ${previstoAtivas} ativas e ${previstoAuditoria} linhas de auditoria. ` +
          `Medido: ${depois} e ${auditDepois}. Pare e confira antes de rodar qualquer outra coisa.`,
  );

  await base.$disconnect();
  if (!bate) process.exit(1);
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
