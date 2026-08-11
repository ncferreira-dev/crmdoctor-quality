// Marca como demonstração as linhas listadas em docs/demo-producao-ids.json.
//
// É o item 9 do ENTREGA.md. A produção mistura cenário de venda e trabalho de
// cliente desde o começo, e a lista de ids era a única coisa que sabia a
// diferença. Um arquivo no repositório não é resposta: quem abre o dashboard
// não vai conferir ids à mão. Depois deste script a pergunta "quantos projetos
// reais existem" é uma consulta.
//
// Marca, não apaga. O cenário serve para mostrar o produto, e apagar levaria
// junto o histórico que o torna convincente. `demonstracao` é reversível: o dia
// em que um desses virar cliente de verdade, é um UPDATE de volta.
//
// Uso, na pasta api/ (ENSAIO por padrão):
//   npm run demo:marcar:producao -- --destino=<trecho-da-url> --como=<email>
//
// Travas iguais às dos outros scripts de produção: --destino conferido contra a
// DATABASE_URL, --como obrigatório para a auditoria ter dono, ensaio por padrão.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarExtensaoAuditoria } from '../src/prisma/prisma-audit.extension';
import { runWith } from '../src/common/context/request-context';

// Só estas três carregam a coluna. Marco, tarefa, ticket e visita são derivados
// do projeto ou da empresa (ver src/common/demonstracao.ts): repetir a flag em
// cada filho seria criar quatro lugares para a mesma verdade divergir.
const ARQUIVO_IDS = join(__dirname, '../../docs/demo-producao-ids.json');

interface ListaDeIds {
  empresas: string[];
  projetos: string[];
  interacoes: string[];
}

function argumento(prefixo: string): string | undefined {
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

async function main() {
  const destino = argumento('--destino=');
  const como = argumento('--como=');
  const aplicar = process.argv.includes('--aplicar');

  if (!destino) {
    throw new Error(
      'Faltou --destino=<trecho-da-url>. Ele obriga quem roda a declarar em ' +
        'qual banco acha que está mexendo. Nada foi alterado.',
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
      'Faltou --como=<email>. É quem responde pela marcação, e é o que vai ' +
        'para o audit_log.',
    );
  }

  const ids = JSON.parse(readFileSync(ARQUIVO_IDS, 'utf8')) as ListaDeIds;

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
      `ABORTADO. A conta ${como} não existe neste banco ou está desativada. ` +
        'Nada foi alterado.',
    );
  }

  console.log(aplicar ? 'MODO APLICAR.' : 'ENSAIO: nada será escrito.');
  console.log(`Banco conferido: a URL contém "${destino}"`);
  console.log(`Quem assina: ${autor.nome.trim()} <${autor.email}>`);
  console.log('');

  const auditAntes = await prisma.auditLog.count();

  const grupos = [
    { nome: 'EmpresaCliente', chave: 'empresaCliente', lista: ids.empresas },
    { nome: 'Projeto', chave: 'projeto', lista: ids.projetos },
    { nome: 'Interacao', chave: 'interacao', lista: ids.interacoes },
  ] as const;

  const delegates = prisma as unknown as Record<
    string,
    {
      findUnique(args: {
        where: { id: string };
        select: Record<string, boolean>;
      }): Promise<Record<string, unknown> | null>;
      update(args: { where: { id: string }; data: unknown }): Promise<unknown>;
      count(args?: { where?: unknown }): Promise<number>;
    }
  >;

  let marcados = 0;
  const sumidos: string[] = [];

  for (const grupo of grupos) {
    console.log(`${grupo.nome}: ${grupo.lista.length} id(s) na lista`);
    for (const id of grupo.lista) {
      const atual = await delegates[grupo.chave].findUnique({
        where: { id },
        select: { id: true, demonstracao: true },
      });

      // Id que não existe mais é informação, não erro: significa que a lista
      // envelheceu. Fica registrado e o script segue.
      if (!atual) {
        console.log(`  ${id}: NÃO EXISTE mais neste banco`);
        sumidos.push(`${grupo.nome} ${id}`);
        continue;
      }
      if (atual.demonstracao === true) {
        console.log(`  ${id}: já estava marcado`);
        continue;
      }
      if (!aplicar) {
        console.log(`  ${id}: seria marcado`);
        continue;
      }

      // O await fica DENTRO do runWith: a PrismaPromise é preguiçosa, e sem
      // isso a linha de auditoria sai sem autor, calada.
      await runWith({ usuarioId: autor.id }, async () => {
        await delegates[grupo.chave].update({
          where: { id },
          data: { demonstracao: true },
        });
      });
      marcados += 1;
      console.log(`  ${id}: MARCADO`);
    }
    console.log('');
  }

  if (!aplicar) {
    console.log('Ensaio: nada foi escrito. Repita com --aplicar para valer.');
    await base.$disconnect();
    return;
  }

  // A prova é a contagem depois, e não a soma do que o laço achou que fez.
  const [empresasDemo, projetosDemo, interacoesDemo] = await Promise.all([
    delegates.empresaCliente.count({ where: { demonstracao: true } }),
    delegates.projeto.count({ where: { demonstracao: true } }),
    delegates.interacao.count({ where: { demonstracao: true } }),
  ]);
  const [empresasReais, projetosReais] = await Promise.all([
    delegates.empresaCliente.count({ where: { demonstracao: false } }),
    delegates.projeto.count({ where: { demonstracao: false } }),
  ]);
  const auditDepois = await prisma.auditLog.count();

  console.log('DEPOIS:');
  console.log(
    `  empresas de demonstração: ${empresasDemo}, reais: ${empresasReais}`,
  );
  console.log(
    `  projetos de demonstração: ${projetosDemo}, reais: ${projetosReais}`,
  );
  console.log(`  interações de demonstração: ${interacoesDemo}`);
  console.log(`  linhas de auditoria: ${auditAntes} -> ${auditDepois}`);
  if (sumidos.length > 0) {
    console.log(`  ids da lista que não existem mais: ${sumidos.length}`);
  }
  console.log('');

  const previstoEmpresas =
    ids.empresas.length - contarSumidos(sumidos, 'EmpresaCliente');
  const previstoProjetos =
    ids.projetos.length - contarSumidos(sumidos, 'Projeto');
  const previstoInteracoes =
    ids.interacoes.length - contarSumidos(sumidos, 'Interacao');
  const bate =
    empresasDemo === previstoEmpresas &&
    projetosDemo === previstoProjetos &&
    interacoesDemo === previstoInteracoes &&
    auditDepois === auditAntes + marcados;

  console.log(
    bate
      ? `CONFERIDO: ${marcados} marcação(ões), e as contagens batem com a lista.`
      : `DIVERGIU. Previsto ${previstoEmpresas} empresas, ${previstoProjetos} projetos e ` +
          `${previstoInteracoes} interações de demonstração. Medido: ${empresasDemo}, ` +
          `${projetosDemo} e ${interacoesDemo}. Pare e confira.`,
  );

  await base.$disconnect();
  if (!bate) process.exit(1);
}

function contarSumidos(sumidos: string[], prefixo: string): number {
  return sumidos.filter((s) => s.startsWith(prefixo)).length;
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
