// Migração pontual do split ver/gerenciar membros. A partir do deploy, listar
// membros passa a exigir USUARIOS_READ (antes exigia USUARIOS_MANAGE). Os
// cargos já gravados no banco não têm a permissão nova, então sem esta migração
// TODO mundo perderia a tela de Membros — inclusive quem gerencia.
//
// Uso, dentro do container (uma vez, após o deploy):
//   node dist/prisma/migrar-usuarios-read.js
//
// Cirúrgica de propósito: mexe SÓ em USUARIOS_READ e USUARIOS_MANAGE. Nível e
// todas as outras permissões ficam intactos — não reverte nada que você tenha
// ajustado pela tela (ex.: o nível do CEO). Idempotente: rodar de novo não muda
// mais nada depois da primeira vez.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cargos que devem ficar só com "ver" (perdem o "gerenciar"). Decisão de
// produto: coordenação enxerga a equipe, mas contratar/editar/resetar é da
// liderança.
const SOMENTE_LEITURA = ['Coordenador'];

async function main() {
  const cargos = await prisma.cargo.findMany();

  for (const cargo of cargos) {
    const set = new Set(cargo.permissoes);
    const antes = [...set].sort().join(',');

    // Quem podia gerenciar sempre pôde ver (era o único jeito de ver). Preserva
    // esse acesso dando o READ explícito a todo cargo que tem o MANAGE.
    if (set.has('USUARIOS_MANAGE')) {
      set.add('USUARIOS_READ');
    }

    // Rebaixa os cargos marcados para somente leitura.
    if (SOMENTE_LEITURA.includes(cargo.nome)) {
      set.delete('USUARIOS_MANAGE');
      set.add('USUARIOS_READ');
    }

    const depois = [...set].sort().join(',');
    if (antes === depois) {
      console.log(`  ${cargo.nome}: sem mudança`);
      continue;
    }

    await prisma.cargo.update({
      where: { id: cargo.id },
      data: { permissoes: [...set] },
    });
    const rotulo = set.has('USUARIOS_MANAGE') ? 'ver + gerenciar' : 'ver';
    console.log(`  ${cargo.nome}: membros -> ${rotulo}`);
  }

  console.log('');
  console.log('Migração concluída.');
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
