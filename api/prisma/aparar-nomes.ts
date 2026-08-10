// Apara espaço sobrando em texto gravado, tabela por tabela, com rastro.
//
// É o item 29 do ENTREGA.md. Os DTOs já aparam na entrada desde 05/08/2026, e
// isso resolve o futuro: o que ficou gravado antes continua errado, e continua
// atrapalhando onde o texto vira chave. "Giovanna " e "Giovanna" são duas
// pessoas diferentes no filtro de consultor da agenda e na carga por
// responsável do dashboard.
//
// A varredura NÃO é só de `User.nome`, e é de propósito. A regra da classe do
// CLAUDE.md diz que correção de defeito de padrão só conta com varredura
// provando que sobrou zero. Então este script olha TODO campo de texto de TODO
// model, e não só o campo que alguém notou.
//
// Uso, na pasta api/ (ENSAIO por padrão, não escreve nada):
//   npm run nomes:aparar:producao -- --destino=<trecho-da-url> --como=<email>
//
// Para escrever de verdade, acrescente --aplicar.
//
// As travas são as mesmas do desativar-contas.ts: --destino conferido contra a
// DATABASE_URL, --como obrigatório para a auditoria ter dono, e ensaio por
// padrão.

import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarExtensaoAuditoria } from '../src/prisma/prisma-audit.extension';
import { runWith } from '../src/common/context/request-context';

// Campo que guarda segredo não é aparado nem lido: hash não tem espaço
// sobrando, e o valor não tem por que passar por aqui.
const NUNCA_TOCAR = new Set([
  'senhaHash',
  'codigoConvite',
  'codigoConviteHash',
]);

// Tabelas escritas em lote pelo cron. A mensagem da notificação é um retrato do
// dia em que ela nasceu: aparar mudaria um texto histórico, e o índice único
// dela nem deixaria regravar.
const FORA_DA_VARREDURA = new Set([
  'AuditLog',
  'CronExecucao',
  'Notificacao',
  'NotificacaoDestinatario',
]);

interface Achado {
  model: string;
  campo: string;
  id: string;
  antes: string;
  depois: string;
}

function argumento(prefixo: string): string | undefined {
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

function tabelaDe(model: Prisma.DMMF.Model): string {
  return model.dbName ?? model.name;
}

async function main() {
  const destino = argumento('--destino=');
  const como = argumento('--como=');
  const aplicar = process.argv.includes('--aplicar');

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
      'Faltou --como=<email>. É quem responde pela correção, e é o que vai ' +
        'para o audit_log.',
    );
  }

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

  // A varredura é por SQL cru, e não pelo client, pelo mesmo motivo do
  // exportador de backup: ela precisa funcionar mesmo se o banco estiver fora
  // de sincronia com o schema. `btrim` é o trim do Postgres.
  const achados: Achado[] = [];
  let camposVarridos = 0;

  for (const model of Prisma.dmmf.datamodel.models) {
    if (FORA_DA_VARREDURA.has(model.name)) continue;

    const tabela = tabelaDe(model);
    const campos = model.fields.filter(
      (campo) =>
        campo.kind === 'scalar' &&
        campo.type === 'String' &&
        // Lista de texto fica de fora: `btrim` não recebe array, e o único
        // campo assim é `Cargo.permissoes`, que guarda constante do sistema e
        // não texto digitado por gente.
        !campo.isList &&
        campo.name !== 'id' &&
        !NUNCA_TOCAR.has(campo.name),
    );

    for (const campo of campos) {
      camposVarridos += 1;
      const linhas = await prisma.$queryRawUnsafe<
        Array<{ id: string; valor: string }>
      >(
        `SELECT "id", "${campo.name}" AS valor FROM "${tabela}" ` +
          `WHERE "${campo.name}" IS NOT NULL AND "${campo.name}" <> btrim("${campo.name}")`,
      );
      for (const linha of linhas) {
        achados.push({
          model: model.name,
          campo: campo.name,
          id: linha.id,
          antes: linha.valor,
          depois: linha.valor.trim(),
        });
      }
    }
  }

  console.log(`Campos de texto varridos: ${camposVarridos}`);
  console.log(`Valores com espaço sobrando: ${achados.length}`);
  console.log('');

  if (achados.length === 0) {
    console.log('Nada a corrigir: nenhum texto difere do próprio trim().');
    await base.$disconnect();
    return;
  }

  for (const a of achados) {
    console.log(
      `  ${a.model}.${a.campo}: ${JSON.stringify(a.antes)} -> ${JSON.stringify(a.depois)}`,
    );
  }
  console.log('');

  if (!aplicar) {
    console.log('Ensaio: nada foi escrito. Repita com --aplicar para valer.');
    await base.$disconnect();
    return;
  }

  // Um update por linha, e não um UPDATE em massa por SQL: é o caminho que
  // passa pela extensão de auditoria, e sem ele a correção não deixaria rastro.
  // O await fica DENTRO do runWith porque a PrismaPromise é preguiçosa, e essa
  // distinção já custou três linhas de auditoria sem autor em 10/08/2026.
  const delegates = prisma as unknown as Record<
    string,
    { update(args: { where: { id: string }; data: unknown }): Promise<unknown> }
  >;

  let corrigidos = 0;
  for (const a of achados) {
    const chave = a.model.charAt(0).toLowerCase() + a.model.slice(1);
    await runWith({ usuarioId: autor.id }, async () => {
      await delegates[chave].update({
        where: { id: a.id },
        data: { [a.campo]: a.depois },
      });
    });
    corrigidos += 1;
    console.log(`  ${a.model}.${a.campo} (${a.id}): corrigido`);
  }

  console.log('');
  const auditDepois = await prisma.auditLog.count();
  const previsto = auditAntes + corrigidos;
  console.log(`Linhas de auditoria: ${auditAntes} -> ${auditDepois}`);

  // Reconferência: a mesma varredura de novo tem que voltar vazia. É a prova de
  // que sobrou zero, e não a contagem de quantos eu achei que consertei.
  let sobraram = 0;
  for (const model of Prisma.dmmf.datamodel.models) {
    if (FORA_DA_VARREDURA.has(model.name)) continue;
    const tabela = tabelaDe(model);
    for (const campo of model.fields.filter(
      (c) =>
        c.kind === 'scalar' &&
        c.type === 'String' &&
        !c.isList &&
        c.name !== 'id' &&
        !NUNCA_TOCAR.has(c.name),
    )) {
      const restantes = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*)::int AS n FROM "${tabela}" ` +
          `WHERE "${campo.name}" IS NOT NULL AND "${campo.name}" <> btrim("${campo.name}")`,
      );
      sobraram += Number(restantes[0].n);
    }
  }

  console.log(`Varredura de novo, depois da correção: ${sobraram} sobrando`);
  console.log('');

  const bate = sobraram === 0 && auditDepois === previsto;
  console.log(
    bate
      ? `CONFERIDO: ${corrigidos} correção(ões), varredura limpa e auditoria batendo.`
      : `DIVERGIU. Esperado 0 sobrando e ${previsto} linhas de auditoria. ` +
          `Medido: ${sobraram} e ${auditDepois}. Pare e confira.`,
  );

  await base.$disconnect();
  if (!bate) process.exit(1);
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
