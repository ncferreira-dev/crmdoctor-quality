// Bootstrap do primeiro usuário nomeado. Existe como script, e não como uma
// chamada de API, por um motivo: criar alguém no topo da hierarquia é
// exatamente o que a API proíbe (exigirNivelMenor só deixa criar cargo de
// nível MENOR que o seu). O admin do seed, em nível 100, nunca conseguiria
// criar um nível 110. Esse degrau só se sobe por fora.
//
// Uso, dentro do container:
//   node dist/prisma/criar-usuario-inicial.js "Nome Completo" email@dominio.com
//
// O script não desativa o admin genérico de propósito. Desative pela tela de
// Membros depois de confirmar que você consegue entrar com a conta nova —
// senão um erro no meio do caminho tranca todo mundo do lado de fora.

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt, randomUUID } from 'node:crypto';
import { PERMISSOES } from '../src/common/constants/permissoes';

const prisma = new PrismaClient();

const CARGO_NOME = 'Desenvolvedor';
// Acima do Administrador do seed (100). Quem está aqui gerencia todo mundo,
// inclusive o admin genérico, e é quem vai criar os cargos abaixo (CEO etc).
const CARGO_NIVEL = 110;

async function main() {
  const [nome, email] = process.argv.slice(2);
  if (!nome || !email) {
    throw new Error(
      'Uso: node dist/prisma/criar-usuario-inicial.js "Nome Completo" email@dominio.com',
    );
  }

  const jaExiste = await prisma.user.findUnique({ where: { email } });
  if (jaExiste) {
    throw new Error(`Já existe um usuário com o e-mail ${email}`);
  }

  const cargo = await prisma.cargo.upsert({
    where: { nome: CARGO_NOME },
    update: { nivel: CARGO_NIVEL, permissoes: [...PERMISSOES] },
    create: { nome: CARGO_NOME, nivel: CARGO_NIVEL, permissoes: [...PERMISSOES] },
  });

  // Mesma mecânica do cadastro pela tela: a conta nasce sem senha utilizável e
  // só o resgate do código define a senha real. Nem este script sabe a senha.
  const codigoConvite = String(randomInt(10_000_000, 100_000_000));
  const user = await prisma.user.create({
    data: {
      nome,
      email,
      senhaHash: await argon2.hash(randomUUID()),
      codigoConvite,
      cargoId: cargo.id,
    },
  });

  console.log('');
  console.log(`Usuário criado: ${user.nome} <${user.email}>`);
  console.log(`Cargo: ${cargo.nome} (nível ${cargo.nivel}, todas as permissões)`);
  console.log('');
  console.log(`CÓDIGO DE PRIMEIRO ACESSO: ${codigoConvite}`);
  console.log('');
  console.log('Use esse código em /primeiro-acesso para definir sua senha.');
  console.log('Ele aparece uma vez só. Depois de entrar, desative o admin');
  console.log('genérico pela tela de Membros.');
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
