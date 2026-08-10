// Restaura um arquivo gerado por exportar-backup.ts para dentro de um banco.
// É a outra metade do backup: até 07/08/2026 existia a cópia e não existia o
// caminho de volta, o que é uma sensação de segurança, não segurança.
//
// Uso:
//   node dist/prisma/importar-backup.js <arquivo.json> --destino=<trecho-do-host> [--limpar]
//
// Exemplo (banco local):
//   node dist/prisma/importar-backup.js backup.json --destino=localhost --limpar
//
// TRÊS TRAVAS, e nenhuma delas é exagero. Este script escreve em banco inteiro,
// que é a categoria de comando que já derrubou a produção uma vez (04/08/2026,
// por confiar em documentação em vez de conferir onde estava pisando).
//
//   1. --destino é OBRIGATÓRIO e precisa aparecer dentro da DATABASE_URL. Quem
//      roda é forçado a declarar onde acha que está escrevendo, e o script
//      confere. Digitar "localhost" enquanto o .env aponta para o Neon aborta
//      sem tocar em nada.
//   2. Banco com dado aborta. Restauração normal é para banco vazio. Escrever
//      por cima do que já existe precisa de --limpar, escrito à mão.
//   3. --limpar apaga TUDO antes de importar, na ordem inversa das dependências.
//      Está separado da trava 2 de propósito: são duas decisões, não uma.
//
// A ordem de inserção sai das relações declaradas no schema, não de uma lista
// mantida à mão: tabela nova é ordenada sozinha, como no exportador.

import { readFileSync } from 'node:fs';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Arquivo {
  exportadoEm: string;
  dados: Record<string, Array<Record<string, unknown>>>;
}

function delegateDe(nomeModel: string): string {
  return nomeModel.charAt(0).toLowerCase() + nomeModel.slice(1);
}

function delegateDo(nomeModel: string) {
  return (
    prisma as unknown as Record<
      string,
      {
        createMany(args: { data: unknown[] }): Promise<{ count: number }>;
        count(): Promise<number>;
        deleteMany(): Promise<{ count: number }>;
      }
    >
  )[delegateDe(nomeModel)];
}

// Ordena os models de forma que ninguém seja inserido antes daquilo de que
// depende. A dependência é a chave estrangeira: quem carrega relationFromFields
// aponta para o outro, logo o outro entra primeiro.
//
// Auto-relação é ignorada de propósito: a tabela não pode esperar por si mesma,
// e o banco resolve dentro da mesma transação.
function ordemDeInsercao(): string[] {
  const models = Prisma.dmmf.datamodel.models;

  const dependenciasDe = new Map<string, string[]>();
  for (const model of models) {
    const alvos = model.fields
      .filter(
        (campo) =>
          campo.kind === 'object' &&
          (campo.relationFromFields?.length ?? 0) > 0 &&
          campo.type !== model.name,
      )
      .map((campo) => campo.type);
    dependenciasDe.set(model.name, [...new Set(alvos)]);
  }

  const ordenados: string[] = [];
  const prontos = new Set<string>();
  const emCurso = new Set<string>();

  function visitar(nome: string) {
    if (prontos.has(nome) || emCurso.has(nome)) return;
    emCurso.add(nome);
    for (const dependencia of dependenciasDe.get(nome) ?? []) {
      visitar(dependencia);
    }
    emCurso.delete(nome);
    prontos.add(nome);
    ordenados.push(nome);
  }

  for (const model of models) visitar(model.name);
  return ordenados;
}

// O JSON não tem tipo de data: o que saiu como Date volta como string ISO, e o
// Prisma recusa string onde espera DateTime. Converte pelo tipo declarado no
// schema, não por adivinhação de formato.
//
// Também descarta qualquer chave que não seja campo escalar do model, e ANUNCIA
// o que descartou. O erro do Prisma para campo desconhecido não diz qual linha o
// trouxe, então descartar é o caminho certo; descartar calado não é.
//
// Isto deixou de ser hipótese em 10/08/2026: o exportador passou a ler por SQL
// cru, e um backup de um banco atrasado traz colunas que o schema novo não tem
// mais (a produção ainda guarda `codigoConvite` em texto puro). Restaurar esse
// arquivo aqui apaga essa coluna, e quem restaura precisa ler isso na tela, e
// não descobrir depois.
function prepararLinha(
  model: Prisma.DMMF.Model,
  linha: Record<string, unknown>,
  descartadas: Set<string>,
): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  const conhecidos = new Set<string>();

  for (const campo of model.fields) {
    if (campo.kind !== 'scalar' && campo.kind !== 'enum') continue;
    conhecidos.add(campo.name);
    if (!(campo.name in linha)) continue;

    const valor = linha[campo.name];
    saida[campo.name] =
      campo.type === 'DateTime' && typeof valor === 'string'
        ? new Date(valor)
        : valor;
  }

  for (const chave of Object.keys(linha)) {
    if (!conhecidos.has(chave)) descartadas.add(chave);
  }

  return saida;
}

function argumento(prefixo: string): string | undefined {
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

async function main() {
  const caminho = process.argv[2];
  const destino = argumento('--destino=');
  const limpar = process.argv.includes('--limpar');

  if (!caminho || caminho.startsWith('--')) {
    throw new Error(
      'Informe o arquivo: node dist/prisma/importar-backup.js <arquivo.json> --destino=<trecho-do-host>',
    );
  }

  // Trava 1: onde estou escrevendo?
  if (!destino) {
    throw new Error(
      'Faltou --destino=<trecho-do-host>. É obrigatório: ele obriga quem roda a ' +
        'declarar em qual banco acha que está escrevendo, e o script confere ' +
        'contra a DATABASE_URL antes de tocar em qualquer linha.',
    );
  }

  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes(destino)) {
    throw new Error(
      `ABORTADO. Você declarou --destino=${destino}, mas a DATABASE_URL carregada ` +
        'não contém esse trecho. Ou o .env é outro, ou o destino está errado. ' +
        'Nada foi alterado.',
    );
  }

  const arquivo = JSON.parse(readFileSync(caminho, 'utf8')) as Arquivo;
  if (!arquivo?.dados) {
    throw new Error(`${caminho} não parece um backup: falta a chave "dados".`);
  }

  const ordem = ordemDeInsercao();
  const modelsPorNome = new Map(
    Prisma.dmmf.datamodel.models.map((m) => [m.name, m]),
  );
  const ligacoes = Object.keys(arquivo.dados)
    .filter((chave) => chave.startsWith('_'))
    .sort();

  console.log(`Backup de ${arquivo.exportadoEm}`);
  console.log(`Destino conferido: contém "${destino}"`);
  console.log('');

  // Trava 2: o banco está vazio?
  const ocupadas: string[] = [];
  for (const nome of ordem) {
    const quantos = await delegateDo(nome).count();
    if (quantos > 0) ocupadas.push(`${nome} (${quantos})`);
  }

  if (ocupadas.length > 0 && !limpar) {
    throw new Error(
      'ABORTADO: o banco de destino não está vazio.\n  ' +
        ocupadas.join('\n  ') +
        '\n\nRestauração normal é para banco vazio. Para sobrescrever mesmo ' +
        'assim, repita o comando com --limpar. Nada foi alterado.',
    );
  }

  // Trava 3: --limpar foi escrito à mão, então apaga.
  if (ocupadas.length > 0) {
    console.log('--limpar: apagando o conteúdo atual antes de importar.');
    for (const nome of [...ordem].reverse()) {
      const { count } = await delegateDo(nome).deleteMany();
      if (count > 0) console.log(`  ${nome}: ${count} apagado(s)`);
    }
    console.log('');
  }

  let total = 0;

  for (const nome of ordem) {
    const linhas = arquivo.dados[nome];
    if (!linhas) {
      console.log(`  ${nome}: ausente no arquivo, pulado`);
      continue;
    }
    if (linhas.length === 0) continue;

    const model = modelsPorNome.get(nome);
    if (!model) continue;

    const descartadas = new Set<string>();
    const { count } = await delegateDo(nome).createMany({
      data: linhas.map((linha) => prepararLinha(model, linha, descartadas)),
    });
    total += count;
    const aviso =
      descartadas.size > 0
        ? `   [coluna(s) do arquivo que este schema não tem, DESCARTADA(S): ${[...descartadas].join(', ')}]`
        : '';
    console.log(`  ${nome}: ${count} registro(s)${aviso}`);
  }

  // As tabelas de ligação entram por último: os dois lados já precisam existir.
  // O nome vem do próprio arquivo, então é conferido contra o schema antes de
  // ir para o SQL — arquivo de backup é dado, não é comando.
  const relacoesConhecidas = new Set(
    Prisma.dmmf.datamodel.models.flatMap((m) =>
      m.fields
        .filter((f) => f.kind === 'object' && f.relationName)
        .map((f) => `_${f.relationName}`),
    ),
  );

  for (const tabela of ligacoes) {
    if (!relacoesConhecidas.has(tabela)) {
      console.log(`  ${tabela}: não existe neste schema, pulado`);
      continue;
    }

    const vinculos = arquivo.dados[tabela] as unknown as Array<{
      A: string;
      B: string;
    }>;
    if (vinculos.length === 0) continue;

    for (const { A, B } of vinculos) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${tabela}" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        A,
        B,
      );
    }
    total += vinculos.length;
    console.log(`  ${tabela}: ${vinculos.length} vínculo(s)`);
  }

  // Conferência: contar de volta e comparar com o arquivo. Sem isto o script
  // diria "importado" mesmo tendo perdido tabela pelo caminho, que é
  // exatamente o defeito que o exportador tinha.
  console.log('');
  const divergencias: string[] = [];
  for (const nome of ordem) {
    const esperado = arquivo.dados[nome]?.length ?? 0;
    const encontrado = await delegateDo(nome).count();
    if (esperado !== encontrado) {
      divergencias.push(
        `${nome}: esperado ${esperado}, encontrado ${encontrado}`,
      );
    }
  }

  for (const tabela of ligacoes) {
    if (!relacoesConhecidas.has(tabela)) continue;
    const esperado = arquivo.dados[tabela].length;
    const [{ total: encontrado }] = await prisma.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(`SELECT count(*) AS total FROM "${tabela}"`);
    if (esperado !== Number(encontrado)) {
      divergencias.push(
        `${tabela}: esperado ${esperado}, encontrado ${Number(encontrado)}`,
      );
    }
  }

  if (divergencias.length > 0) {
    throw new Error(
      'IMPORTADO COM DIVERGÊNCIA. O banco NÃO é cópia fiel do arquivo:\n  ' +
        divergencias.join('\n  '),
    );
  }

  console.log(
    `Importação conferida: ${total} registros, e toda tabela bate com o arquivo.`,
  );
}

main()
  .catch((erro) => {
    console.error('');
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
