import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';

// Mock só do que estes dois fluxos tocam. O hash é real (argon2 de verdade),
// porque é justamente a verificação da senha atual que está sob teste.
// jest.fn() nasce com tipo `any`, e ler `mock.calls[0][0]` dele é acesso
// inseguro: o `as` que vem logo depois passaria a mentir sem ninguém perceber
// se a chamada mudasse. Declarar o argumento como `unknown` mantém a leitura
// tipada e obriga o cast explícito que os testes já fazem.
const metodoPrisma = () => jest.fn<Promise<unknown>, [unknown]>();

function criarMockPrisma() {
  return {
    user: {
      findUnique: metodoPrisma(),
      findMany: metodoPrisma().mockResolvedValue([]),
      update: metodoPrisma().mockResolvedValue({}),
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

// Cargo que abre a tela de Membros para trabalhar (montar agenda, distribuir
// tarefa) e não gerencia conta de ninguém. É este que recebia o telefone da
// empresa inteira.
const COORDENADOR: AuthUser = {
  sub: 'coord-1',
  nome: 'Coordenador',
  email: 'coordenador@doctorquality.com.br',
  cargoNivel: 50,
  permissoes: ['USUARIOS_READ', 'VISITAS_WRITE'],
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
    // O cast é do argumento inteiro, e não do `.data` já lido: `mock.calls[0][0]`
    // é `unknown`, então ler uma propriedade dele antes de tipar é erro de
    // compilação. Foi este acesso que deixou `tsc --noEmit` quebrado desde a
    // limpeza de lint de 07/08/2026, sem ninguém notar, porque `nest build`
    // exclui os `*.spec.ts` e o `npm run lint` rodava com `--fix`.
    const data = (
      prisma.user.update.mock.calls[0][0] as {
        data: { senhaHash: string; senhaDefinidaEm: Date };
      }
    ).data;
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
  // resgate (AuthService.login recusa enquanto o hash do convite existir).
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
    const gravado = (
      prisma.user.update.mock.calls[0][0] as {
        data: { codigoConviteHash: string };
      }
    ).data;
    // O que vai para o banco é o HASH, nunca os 8 dígitos. Este teste existe
    // porque a versão anterior gravava o código em claro, e quem lesse a tabela
    // ou o arquivo de backup entrava na conta.
    expect(gravado.codigoConviteHash).not.toBe(codigoConvite);
    expect(gravado.codigoConviteHash).toMatch(/^\$argon2/);
    await expect(
      argon2.verify(gravado.codigoConviteHash, codigoConvite),
    ).resolves.toBe(true);
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

// O convite deixou de ser guardado em texto puro em 09/08/2026. Estes testes
// travam as duas consequências: o código só existe como hash, e o resgate
// passou a precisar do e-mail, porque argon2 é salgado e não há busca por hash.
describe('UsersService — resgatarConvite', () => {
  const CODIGO = '48219073';

  async function contaPendente(extras: Record<string, unknown> = {}) {
    return {
      id: 'u1',
      nome: 'Giovanna',
      email: 'giovanna@exemplo.com',
      ativo: true,
      codigoConviteHash: await argon2.hash(CODIGO),
      ...extras,
    };
  }

  it('resgata com e-mail e código certos, e grava a senha como hash', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue(await contaPendente());

    const resultado = await servicoCom(prisma).resgatarConvite({
      email: 'giovanna@exemplo.com',
      codigo: CODIGO,
      senha: 'senha-nova-forte',
    });

    expect(resultado).toEqual({
      email: 'giovanna@exemplo.com',
      nome: 'Giovanna',
    });

    // A conta é achada pelo e-mail: com hash salgado não existe findUnique por
    // código, e era essa busca que também deixava varrer o espaço de 8 dígitos
    // sem saber o e-mail de ninguém.
    const busca = prisma.user.findUnique.mock.calls[0][0] as {
      where: { email: string };
    };
    expect(busca.where).toEqual({ email: 'giovanna@exemplo.com' });

    const data = (
      prisma.user.update.mock.calls[0][0] as {
        data: {
          senhaHash: string;
          codigoConviteHash: null;
          senhaDefinidaEm: Date;
        };
      }
    ).data;
    expect(data.senhaHash).not.toBe('senha-nova-forte');
    await expect(
      argon2.verify(data.senhaHash, 'senha-nova-forte'),
    ).resolves.toBe(true);
    // O convite morre no resgate: é de uso único.
    expect(data.codigoConviteHash).toBeNull();
    expect(data.senhaDefinidaEm).toBeInstanceOf(Date);
  });

  it('recusa código errado sem tocar na conta', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue(await contaPendente());

    await expect(
      servicoCom(prisma).resgatarConvite({
        email: 'giovanna@exemplo.com',
        codigo: '00000000',
        senha: 'senha-nova-forte',
      }),
    ).rejects.toThrow('E-mail ou código inválido');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  // Mensagem única para os três casos, de propósito: respostas diferentes
  // transformariam esta rota pública num confirmador de quem tem conta aqui.
  it('diz a MESMA coisa para e-mail inexistente, conta desativada e conta sem convite', async () => {
    const casos = [
      null,
      await contaPendente({ ativo: false }),
      await contaPendente({ codigoConviteHash: null }),
    ];

    for (const caso of casos) {
      const prisma = criarMockPrisma();
      prisma.user.findUnique.mockResolvedValue(caso);
      await expect(
        servicoCom(prisma).resgatarConvite({
          email: 'giovanna@exemplo.com',
          codigo: CODIGO,
          senha: 'senha-nova-forte',
        }),
      ).rejects.toThrow('E-mail ou código inválido');
    }
  });
});

// Item 14 do ENTREGA.md. `semSegredos` tirava senha e convite e deixava o
// telefone passar, então qualquer cargo com USUARIOS_READ (o que monta agenda,
// por exemplo) baixava o número de todo mundo. A tela escondia, a rota
// entregava, que é a mesma maquiagem que o projeto já tinha condenado no valor
// de contrato.
describe('UsersService — telefone só para quem gerencia e para o dono', () => {
  function linhaDeUsuario(id: string, telefone: string | null) {
    return {
      id,
      nome: `Pessoa ${id}`,
      email: `${id}@doctorquality.com.br`,
      telefone,
      senhaHash: 'hash-que-nunca-sai',
      codigoConviteHash: null,
      cargo: { nivel: 10 },
    };
  }

  const EQUIPE = [
    linhaDeUsuario('gestor-1', '(11) 90000-0001'),
    linhaDeUsuario('coord-1', '(11) 90000-0002'),
    linhaDeUsuario('analista-1', '(11) 90000-0003'),
  ];

  it('quem tem USUARIOS_MANAGE recebe o telefone da lista inteira', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findMany.mockResolvedValue(EQUIPE);

    const lista = await servicoCom(prisma).findAll(GESTOR);

    expect(lista.map((u) => u.telefone)).toEqual([
      '(11) 90000-0001',
      '(11) 90000-0002',
      '(11) 90000-0003',
    ]);
  });

  it('quem só tem USUARIOS_READ recebe o próprio número e null nos outros', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findMany.mockResolvedValue(EQUIPE);

    const lista = await servicoCom(prisma).findAll(COORDENADOR);

    expect(lista.map((u) => [u.id, u.telefone])).toEqual([
      ['gestor-1', null],
      ['coord-1', '(11) 90000-0002'],
      ['analista-1', null],
    ]);
  });

  // Fechar só o findAll deixaria a lista limpa e a rota por id aberta: bastaria
  // pedir /users/:id de um em um para remontar a agenda telefônica.
  it('GET /users/:id de terceiro também vem sem o telefone', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue(
      linhaDeUsuario('analista-1', '(11) 90000-0003'),
    );

    const alheio = await servicoCom(prisma).findOne('analista-1', COORDENADOR);
    expect(alheio.telefone).toBeNull();
  });

  it('o dono vê o próprio número por id, que é o que a tela de perfil edita', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findUnique.mockResolvedValue(
      linhaDeUsuario('coord-1', '(11) 90000-0002'),
    );

    const proprio = await servicoCom(prisma).findOne('coord-1', COORDENADOR);
    expect(proprio.telefone).toBe('(11) 90000-0002');
  });

  it('o hash da senha continua fora da resposta nos dois casos', async () => {
    const prisma = criarMockPrisma();
    prisma.user.findMany.mockResolvedValue(EQUIPE);

    for (const quem of [GESTOR, COORDENADOR]) {
      const lista = await servicoCom(prisma).findAll(quem);
      for (const usuario of lista) {
        expect(usuario).not.toHaveProperty('senhaHash');
        expect(usuario).not.toHaveProperty('codigoConviteHash');
      }
    }
  });
});
