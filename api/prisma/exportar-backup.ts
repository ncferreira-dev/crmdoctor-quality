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
// ATENÇÃO: o arquivo contém dados pessoais (nomes, e-mails, telefones) e os
// hashes de senha. Guardar com o mesmo cuidado que se guarda uma senha.

import { writeFileSync } from 'node:fs';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// "User" -> "user", "EtapaProjeto" -> "etapaProjeto": o nome do delegate no
// client é o nome do model com a primeira letra minúscula.
function delegateDe(nomeModel: string): string {
  return nomeModel.charAt(0).toLowerCase() + nomeModel.slice(1);
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

async function main() {
  const destino =
    process.argv[2] ??
    `backup-crm-${new Date().toISOString().slice(0, 10)}.json`;

  const dump: Record<string, unknown[]> = {};
  let total = 0;

  // A lista de models vem do DMMF, não de uma lista mantida à mão: tabela nova
  // no schema entra no backup sozinha, sem depender de alguém lembrar daqui.
  for (const model of Prisma.dmmf.datamodel.models) {
    const delegate = (
      prisma as unknown as Record<string, { findMany(): Promise<unknown[]> }>
    )[delegateDe(model.name)];
    const linhas = await delegate.findMany();
    dump[model.name] = linhas;
    total += linhas.length;
    console.log(`  ${model.name}: ${linhas.length} registro(s)`);
  }

  // As tabelas de ligação entram com o underscore no nome, igual ao banco, e é
  // por ele que o importador as distingue de model.
  //
  // O nome da tabela vem do DMMF, não de entrada externa, então a interpolação
  // no SQL não é superfície de injeção.
  for (const relacao of relacoesImplicitas()) {
    const vinculos = await prisma.$queryRawUnsafe<
      Array<Record<string, string>>
    >(`SELECT "A", "B" FROM "_${relacao}"`);
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
  console.log('Contém dados pessoais e hashes de senha — guarde com cuidado.');
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
