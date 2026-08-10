// Dump completo do banco em JSON, tabela por tabela, para guardar FORA do
// Neon. Não substitui backup de verdade (não tem restore automático), mas
// garante que existe uma cópia dos dados que não depende do provedor — a
// pergunta "cadê o backup" passa a ter uma resposta imediata.
//
// Uso (local com .env válido, ou dentro do container):
//   node dist/prisma/exportar-backup.js [caminho-do-arquivo]
//
// Sem argumento, grava ./backup-crm-<data>.json no diretório atual.
//
// Usa PrismaClient puro (sem a extension de auditoria), então exporta TUDO,
// inclusive registros soft-deletados — num backup, apagado também é dado.
//
// LÊ POR SQL CRU, e não pelos delegates do client, e isso é decisão de
// robustez. Em 10/08/2026 este script ABORTOU contra a produção com
// "The column users.codigoConviteHash does not exist": o banco estava três
// migrations atrás do schema, e o client pedia colunas que ainda não existiam
// lá. Ou seja, o backup parava de funcionar exatamente na situação em que ele é
// mais necessário, que é quando código e banco estão fora de sincronia.
//
// SELECT * não sabe o que o schema espera: traz o que a tabela tem. Colunas que
// existem no banco e não no schema entram no arquivo e são ANUNCIADAS, porque
// backup que perde dado em silêncio é pior que não ter backup.
//
// ATENÇÃO: o arquivo contém dados pessoais (nomes, e-mails, telefones) e os
// hashes de senha. Guardar com o mesmo cuidado que se guarda uma senha.

import { writeFileSync } from 'node:fs';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// O nome da TABELA, que é o que o SQL enxerga: vem do @@map quando existe, e do
// nome do model quando não existe.
function tabelaDe(model: Prisma.DMMF.Model): string {
  return model.dbName ?? model.name;
}

// Os campos que o schema conhece nesta tabela. Serve só para comparar com o que
// veio do banco e apontar a diferença.
function camposConhecidos(model: Prisma.DMMF.Model): Set<string> {
  return new Set(
    model.fields
      .filter((campo) => campo.kind === 'scalar' || campo.kind === 'enum')
      .map((campo) => campo.name),
  );
}

// Relação N-N implícita NÃO é model no DMMF: ela mora numa tabela própria,
// "_<NomeDaRelacao>", com as colunas A e B. O laço por models não a enxerga.
//
// Isto não é detalhe: em 07/08/2026 a produção tinha 8 vínculos em
// _EquipeDoProjeto e nenhum deles estava no backup. Restaurar traria os
// projetos de volta sem equipe, sem erro e sem aviso. Backup que perde dado em
// silêncio é pior que não ter backup, porque ninguém procura o que acha que tem.
//
// Como reconhecer: campo de objeto que é lista e não carrega a chave
// estrangeira (relationFromFields vazio) E cujo lado inverso também é lista. Se
// o inverso não for lista, é um-para-muitos comum, e aí a chave já está na
// tabela do outro lado.
function relacoesImplicitas(): string[] {
  const nomes = new Set<string>();

  for (const model of Prisma.dmmf.datamodel.models) {
    for (const campo of model.fields) {
      const semChaveAqui = (campo.relationFromFields?.length ?? 0) === 0;
      if (campo.kind !== 'object' || !campo.isList || !semChaveAqui) continue;

      const outroLado = Prisma.dmmf.datamodel.models.find(
        (m) => m.name === campo.type,
      );
      const inverso = outroLado?.fields.find(
        (f) => f.relationName === campo.relationName && f.name !== campo.name,
      );

      if (inverso?.isList && campo.relationName) nomes.add(campo.relationName);
    }
  }

  return [...nomes].sort();
}

// Lê a tabela inteira, ou devolve null quando ela não existe neste banco.
// 42P01 é o código do Postgres para "relation does not exist", e é o único erro
// que este script engole: qualquer outro (permissão, conexão) precisa abortar,
// senão o backup sairia incompleto achando que está inteiro.
async function lerTabela(
  tabela: string,
): Promise<Array<Record<string, unknown>> | null> {
  try {
    return await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM "${tabela}"`,
    );
  } catch (erro) {
    const codigo = (erro as { code?: string })?.code;
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    if (codigo === '42P01' || /does not exist/i.test(mensagem)) return null;
    throw erro;
  }
}

async function main() {
  const destino =
    process.argv[2] ??
    `backup-crm-${new Date().toISOString().slice(0, 10)}.json`;

  const dump: Record<string, unknown[]> = {};
  let total = 0;
  const desencontros: string[] = [];

  // A lista de models vem do DMMF, não de uma lista mantida à mão: tabela nova
  // no schema entra no backup sozinha, sem depender de alguém lembrar daqui.
  //
  // O nome da tabela vem do DMMF, então a interpolação abaixo não é superfície
  // de injeção: nada aqui vem de entrada externa.
  for (const model of Prisma.dmmf.datamodel.models) {
    const tabela = tabelaDe(model);
    const linhas = await lerTabela(tabela);

    // Tabela que o schema tem e o banco não é migration que falta aplicar. Não
    // é motivo para abortar o backup: o resto dos dados continua existindo e
    // precisa ser salvo. Mas é motivo para gritar, porque significa que aquele
    // banco está atrás do código.
    if (linhas === null) {
      console.log(`  ${model.name}: TABELA NÃO EXISTE neste banco`);
      desencontros.push(`${tabela}: tabela não existe no banco`);
      continue;
    }

    dump[model.name] = linhas;
    total += linhas.length;

    // A diferença entre o que o banco tem e o que o schema espera é a coisa
    // mais importante que este script pode dizer: ela é o aviso de que código e
    // banco estão fora de sincronia.
    const conhecidos = camposConhecidos(model);
    const doBanco = new Set(linhas.length > 0 ? Object.keys(linhas[0]) : []);
    const soNoBanco = [...doBanco].filter((c) => !conhecidos.has(c));
    const soNoSchema = [...conhecidos].filter((c) => !doBanco.has(c));

    const aviso =
      linhas.length === 0
        ? ''
        : [
            soNoBanco.length ? `só no banco: ${soNoBanco.join(', ')}` : '',
            soNoSchema.length ? `só no schema: ${soNoSchema.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' | ');

    console.log(
      `  ${model.name}: ${linhas.length} registro(s)${aviso ? `   [${aviso}]` : ''}`,
    );
    if (aviso) desencontros.push(`${tabela}: ${aviso}`);
  }

  // As tabelas de ligação entram com o underscore no nome, igual ao banco, e é
  // por ele que o importador as distingue de model.
  //
  // O nome da tabela vem do DMMF, não de entrada externa, então a interpolação
  // no SQL não é superfície de injeção.
  for (const relacao of relacoesImplicitas()) {
    const vinculos = await lerTabela(`_${relacao}`);
    if (vinculos === null) {
      console.log(`  _${relacao}: TABELA NÃO EXISTE neste banco`);
      desencontros.push(`_${relacao}: tabela não existe no banco`);
      continue;
    }
    dump[`_${relacao}`] = vinculos;
    total += vinculos.length;
    console.log(`  _${relacao}: ${vinculos.length} vínculo(s)`);
  }

  writeFileSync(
    destino,
    JSON.stringify(
      { exportadoEm: new Date().toISOString(), dados: dump },
      null,
      2,
    ),
  );

  console.log('');
  console.log(`Backup gravado em ${destino} (${total} registros no total).`);
  console.log('Contém dados pessoais e hashes de senha. Guarde com cuidado.');

  if (desencontros.length > 0) {
    console.log('');
    console.log('ATENÇÃO: este banco não bate com o schema do repositório.');
    for (const linha of desencontros) console.log(`  ${linha}`);
    console.log('');
    console.log(
      'O backup está completo (SELECT * traz o que a tabela tem). O aviso é ' +
        'sobre o BANCO: falta migration aplicada, ou sobra coluna que o schema ' +
        'já não conhece. Restaurar isto num banco com o schema novo descarta as ' +
        'colunas que só existem no banco, e o importador diz quais.',
    );
  }
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
