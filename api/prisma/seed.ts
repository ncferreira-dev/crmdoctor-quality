import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSOES } from '../src/common/constants/permissoes';

const prisma = new PrismaClient();

async function main() {
  const senha = process.env.SEED_ADMIN_PASSWORD;
  if (!senha) {
    throw new Error('Defina SEED_ADMIN_PASSWORD no .env antes de rodar o seed');
  }

  const cargoAdmin = await prisma.cargo.upsert({
    where: { nome: 'Administrador' },
    update: { permissoes: [...PERMISSOES] },
    create: {
      nome: 'Administrador',
      nivel: 100,
      permissoes: [...PERMISSOES],
    },
  });

  const senhaHash = await argon2.hash(senha);

  await prisma.user.upsert({
    where: { email: 'admin@drquality.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@drquality.com.br',
      senhaHash,
      cargoId: cargoAdmin.id,
    },
  });

  console.log('Seed concluído: cargo Administrador e usuário admin criados.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
