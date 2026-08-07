// Contas de teste com senha JÁ definida, para logar como cada cargo e ver o
// que ele enxerga. Difere do cadastro normal de propósito: aqui a senha é
// conhecida (o fluxo real nunca deixa terceiro definir senha de alguém), então
// isto NÃO é o caminho de produção — é ferramenta de teste.
//
// Uso, dentro do container:
//   node dist/prisma/criar-usuarios-teste.js
//
// Idempotente: reexecutar reaplica cargo e senha, não duplica. Todas as contas
// usam e-mail @teste.com para serem fáceis de achar e apagar depois (na tela de
// Membros: desativar e depois excluir).

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SENHA = 'teste123';

// nomeCargo casa com o nome exato do cargo já existente no banco.
const CONTAS: Array<{ nome: string; email: string; nomeCargo: string }> = [
  {
    nome: 'Coordenador de Teste',
    email: 'coordenador@teste.com',
    nomeCargo: 'Coordenador',
  },
  {
    nome: 'Analista de Teste',
    email: 'analista@teste.com',
    nomeCargo: 'Analista de validação/qualificação',
  },
];

async function main() {
  const senhaHash = await argon2.hash(SENHA);

  for (const conta of CONTAS) {
    const cargo = await prisma.cargo.findUnique({
      where: { nome: conta.nomeCargo },
    });
    if (!cargo) {
      console.log(
        `  PULADO: cargo "${conta.nomeCargo}" não existe. Rode criar-cargos-iniciais antes.`,
      );
      continue;
    }

    // senhaDefinidaEm preenchido e codigoConvite null: a conta já loga direto,
    // sem passar pelo primeiro acesso.
    await prisma.user.upsert({
      where: { email: conta.email },
      update: {
        senhaHash,
        cargoId: cargo.id,
        ativo: true,
        codigoConvite: null,
        senhaDefinidaEm: new Date(),
      },
      create: {
        nome: conta.nome,
        email: conta.email,
        senhaHash,
        cargoId: cargo.id,
        ativo: true,
        senhaDefinidaEm: new Date(),
      },
    });
    console.log(`  ${conta.email}  (${conta.nomeCargo})  senha: ${SENHA}`);
  }

  console.log('');
  console.log(
    'Contas de teste prontas. São @teste.com — apague pela tela de Membros quando não precisar mais.',
  );
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
