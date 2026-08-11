import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, tokenAnteriorASenhaAtual } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

type UsuarioNoBanco = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  codigoConviteHash: string | null;
  senhaDefinidaEm: Date | null;
  cargo: { nivel: number; permissoes: string[] };
};

const ATIVO: UsuarioNoBanco = {
  id: 'u-1',
  nome: 'Fabrício',
  email: 'fabricio@drquality.com.br',
  ativo: true,
  codigoConviteHash: null,
  senhaDefinidaEm: null,
  cargo: { nivel: 60, permissoes: ['LEADS_READ', 'VISITAS_READ'] },
};

function estrategiaCom(user: UsuarioNoBanco | null): JwtStrategy {
  const config = {
    getOrThrow: () => 'segredo-de-teste',
  } as unknown as ConfigService;
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
  } as unknown as PrismaService;
  return new JwtStrategy(config, prisma);
}

describe('JwtStrategy.validate', () => {
  it('monta o usuário da request com o que está no banco, não com o que veio no token', async () => {
    const user = await estrategiaCom(ATIVO).validate({ sub: 'u-1' });

    expect(user).toEqual({
      sub: 'u-1',
      nome: 'Fabrício',
      email: 'fabricio@drquality.com.br',
      cargoNivel: 60,
      permissoes: ['LEADS_READ', 'VISITAS_READ'],
    });
  });

  it('recusa token de conta que não existe mais', async () => {
    await expect(
      estrategiaCom(null).validate({ sub: 'sumiu' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // O motivo de existir desta mudança: a tela de Membros promete que desativar
  // corta o acesso, e antes disto o desativado seguia dentro até o token vencer.
  it('recusa token de conta desativada', async () => {
    const estrategia = estrategiaCom({ ...ATIVO, ativo: false });
    await expect(estrategia.validate({ sub: 'u-1' })).rejects.toThrow(
      'Conta desativada',
    );
  });

  it('recusa token de conta com acesso redefinido (convite pendente)', async () => {
    const estrategia = estrategiaCom({
      ...ATIVO,
      codigoConviteHash: '$argon2id$hash-de-convite',
    });
    await expect(estrategia.validate({ sub: 'u-1' })).rejects.toThrow(
      'Acesso redefinido: use o código de primeiro acesso',
    );
  });

  it('recusa token emitido antes da troca de senha', async () => {
    const senhaDefinidaEm = new Date('2026-08-04T12:00:00Z');
    const estrategia = estrategiaCom({ ...ATIVO, senhaDefinidaEm });
    await expect(
      estrategia.validate({ sub: 'u-1', iat: 1_785_000_000 }),
    ).rejects.toThrow('Senha alterada: entre novamente');
  });

  it('aceita token emitido depois da troca de senha', async () => {
    const senhaDefinidaEm = new Date('2026-08-04T12:00:00Z');
    const iat = Math.floor(senhaDefinidaEm.getTime() / 1000) + 5;
    const estrategia = estrategiaCom({ ...ATIVO, senhaDefinidaEm });

    await expect(
      estrategia.validate({ sub: 'u-1', iat }),
    ).resolves.toMatchObject({ sub: 'u-1' });
  });

  it('reflete o cargo atual quando a pessoa é promovida com a sessão aberta', async () => {
    const estrategia = estrategiaCom({
      ...ATIVO,
      cargo: { nivel: 100, permissoes: ['CARGOS_MANAGE'] },
    });

    await expect(estrategia.validate({ sub: 'u-1' })).resolves.toMatchObject({
      cargoNivel: 100,
      permissoes: ['CARGOS_MANAGE'],
    });
  });
});

describe('tokenAnteriorASenhaAtual', () => {
  it('não invalida quem nunca definiu senha (conta só com convite)', () => {
    expect(tokenAnteriorASenhaAtual(null, 1_785_000_000)).toBe(false);
  });

  // Corrida real: resgatar o convite grava senhaDefinidaEm com milissegundos e
  // o login vem logo em seguida, no mesmo segundo. Comparando em milissegundos,
  // esse token nasceria inválido e a pessoa não entraria depois do primeiro
  // acesso.
  it('não invalida token emitido no mesmo segundo em que a senha foi definida', () => {
    const senhaDefinidaEm = new Date('2026-08-04T12:00:00.500Z');
    const iat = Math.floor(senhaDefinidaEm.getTime() / 1000);
    expect(tokenAnteriorASenhaAtual(senhaDefinidaEm, iat)).toBe(false);
  });

  it('invalida token de um segundo antes', () => {
    const senhaDefinidaEm = new Date('2026-08-04T12:00:00.000Z');
    const iat = Math.floor(senhaDefinidaEm.getTime() / 1000) - 1;
    expect(tokenAnteriorASenhaAtual(senhaDefinidaEm, iat)).toBe(true);
  });

  it('ignora token sem iat em vez de derrubar a sessão', () => {
    expect(tokenAnteriorASenhaAtual(new Date(), undefined)).toBe(false);
  });
});
