// Break-glass: gera um novo código de primeiro acesso para QUALQUER conta,
// inclusive a do topo da hierarquia. Existe porque a API não cobre um caso:
// reenviar-convite exige nível estritamente maior que o do alvo, e ninguém tem
// nível maior que o topo. Se o dono do sistema esquecer a própria senha, esta
// é a única saída que não envolve editar o banco na mão.
//
// Uso, dentro do container (ou local com .env válido):
//   node dist/prisma/resetar-acesso.js email@dominio.com
//   node dist/prisma/resetar-acesso.js email@dominio.com --reativar
//
// Efeito: a senha atual da conta deixa de valer na hora (o login recusa quem
// tem código pendente) e só volta a existir quando o código for resgatado em
// /primeiro-acesso. --reativar religa uma conta desativada no mesmo passo.
//
// Isto contorna o RBAC por definição — só roda quem tem acesso ao container
// ou ao banco, que é exatamente o perímetro certo para um break-glass.

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || !email.includes('@')) {
    throw new Error(
      'Uso: node dist/prisma/resetar-acesso.js email@dominio.com [--reativar]',
    );
  }
  const reativar = flag === '--reativar';

  const user = await prisma.user.findUnique({
    where: { email },
    include: { cargo: true },
  });
  if (!user) {
    throw new Error(`Nenhuma conta com o e-mail ${email}`);
  }
  if (!user.ativo && !reativar) {
    throw new Error(
      `A conta ${email} está desativada. Rode de novo com --reativar se for intencional.`,
    );
  }

  const codigoConvite = String(randomInt(10_000_000, 100_000_000));
  await prisma.user.update({
    where: { id: user.id },
    data: {
      codigoConviteHash: await argon2.hash(codigoConvite),
      ...(reativar ? { ativo: true } : {}),
    },
  });

  console.log('');
  console.log(
    `Conta: ${user.nome} <${user.email}> — ${user.cargo.nome} (nível ${user.cargo.nivel})`,
  );
  if (reativar && !user.ativo) {
    console.log('Conta REATIVADA.');
  }
  console.log('');
  console.log(`NOVO CÓDIGO DE ACESSO: ${codigoConvite}`);
  console.log('');
  console.log('A senha antiga desta conta deixou de valer agora. Use o código');
  console.log('em /primeiro-acesso para definir uma senha nova.');
  console.log('');
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
