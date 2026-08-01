import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';

// Mock só do que estes dois fluxos tocam. O hash é real (argon2 de verdade),
// porque é justamente a verificação da senha atual que está sob teste.
function criarMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

type MockPrisma = ReturnType<typeof criarMockPrisma>;

function servicoCom(prisma: MockPrisma) {
  return new UsersService(prisma as unknown as PrismaService);
}

const GESTOR: AuthUser = {
  sub: 'gestor-1',
  nome: 'Gestor',
  email: 'gestor@doctorquality.com.br',
  cargoNivel: 100,
  permissoes: ['USUARIOS_MANAGE'],
};

describe('UsersService — alterarSenha', () => {
  it('troca a senha quando a senha atual confere', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      senhaHash: await argon2.hash('senha-atual-valida'),
    });

    const resultado = await servicoCom(prisma).alterarSenha('u1', {
      senhaAtual: 'senha-atual-valida',
      novaSenha: 'nova-senha-forte',
    });

    expect(resultado).toEqual({ alterada: true });
    const data = prisma.user.update.mock.calls[0][0].data as {
      senhaHash: string;
      senhaDefinidaEm: Date;
    };
    // Grava hash, nunca a senha em claro.
    expect(data.senhaHash).not.toBe('nova-senha-forte');
    await expect(
      argon2.verify(data.senhaHash, 'nova-senha-forte'),
    ).resolves.toBe(true);
    expect(data.senhaDefinidaEm).toBeInstanceOf(Date);
  });

  it('recusa e não grava nada quando a senha atual está errada', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      senhaHash: await argon2.hash('senha-atual-valida'),
    });

    await expect(
      servicoCom(prisma).alterarSenha('u1', {
        senhaAtual: 'chute-errado',
        novaSenha: 'nova-senha-forte',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('UsersService — reenviarConvite', () => {
  it('emite código para quem ainda não definiu senha, sem marcar como reset', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      senhaDefinidaEm: null,
      cargo: { nivel: 10 },
    });

    const { codigoConvite, ehReset } = await servicoCom(prisma).reenviarConvite(
      'u1',
      GESTOR,
    );

    expect(ehReset).toBe(false);
    expect(codigoConvite).toMatch(/^\d{8}$/);
  });

  // Este é o caso que antes lançava ConflictException e deixava quem esquecia a
  // senha sem nenhuma saída. Emitir o código derruba o login por senha até o
  // resgate (AuthService.login recusa enquanto codigoConvite existir).
  it('emite código para quem já definiu senha e sinaliza que é reset', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      senhaDefinidaEm: new Date('2026-07-01'),
      cargo: { nivel: 10 },
    });

    const { codigoConvite, ehReset } = await servicoCom(prisma).reenviarConvite(
      'u1',
      GESTOR,
    );

    expect(ehReset).toBe(true);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ codigoConvite });
  });

  it('não deixa gerar código para cargo de nível igual ou maior que o seu', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      senhaDefinidaEm: null,
      cargo: { nivel: 100 },
    });

    await expect(
      servicoCom(prisma).reenviarConvite('u1', GESTOR),
    ).rejects.toBeDefined();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
