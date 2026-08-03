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
      prisma as unknown as Record<
        string,
        { findMany(): Promise<unknown[]> }
      >
    )[delegateDe(model.name)];
    const linhas = await delegate.findMany();
    dump[model.name] = linhas;
    total += linhas.length;
    console.log(`  ${model.name}: ${linhas.length} registro(s)`);
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
