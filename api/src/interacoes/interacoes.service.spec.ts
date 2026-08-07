import { InteracoesService } from './interacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { FindInteracoesQueryDto } from './dto/find-interacoes-query.dto';

// jest.fn() nasce com tipo `any`, e ler `mock.calls[0][0]` dele é acesso
// inseguro: o `as` que vem logo depois passaria a mentir sem ninguém perceber
// se a chamada mudasse. Declarar o argumento como `unknown` mantém a leitura
// tipada e obriga o cast explícito que os testes já fazem.
const metodoPrisma = () => jest.fn<Promise<unknown>, [unknown]>();

function criarMockPrisma() {
  return {
    interacao: {
      findMany: metodoPrisma(),
      count: metodoPrisma(),
      create: metodoPrisma(),
    },
    user: { findMany: metodoPrisma() },
    lead: { findUnique: metodoPrisma() },
    empresaCliente: { findUnique: metodoPrisma() },
    projeto: { findUnique: metodoPrisma() },
  };
}

type MockPrisma = ReturnType<typeof criarMockPrisma>;

function servicoCom(prisma: MockPrisma) {
  return new InteracoesService(prisma as unknown as PrismaService);
}

function query(
  extra: Partial<FindInteracoesQueryDto> = {},
): FindInteracoesQueryDto {
  return { page: 1, limit: 20, ...extra };
}

describe('InteracoesService', () => {
  describe('findAll', () => {
    it('devolve a linha do tempo do mais recente para o mais antigo', async () => {
      const prisma = criarMockPrisma();
      prisma.interacao.findMany.mockResolvedValue([]);
      prisma.interacao.count.mockResolvedValue(0);

      await servicoCom(prisma).findAll(query({ empresaId: 'e1' }));

      const arg = prisma.interacao.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
        orderBy: { data: string };
      };
      // A ordem importa: linha do tempo que começa pelo contato mais antigo
      // obriga a rolar até o fim para saber o que aconteceu ontem.
      expect(arg.orderBy).toEqual({ data: 'desc' });
      expect(arg.where.empresaId).toBe('e1');
    });

    it('resolve o nome de quem registrou, com UMA consulta para a página toda', async () => {
      const prisma = criarMockPrisma();
      prisma.interacao.findMany.mockResolvedValue([
        { id: 'i1', resumo: 'Ligamos', criadoPorId: 'u1' },
        { id: 'i2', resumo: 'E-mail enviado', criadoPorId: 'u1' },
        { id: 'i3', resumo: 'Reunião', criadoPorId: 'u2' },
      ]);
      prisma.interacao.count.mockResolvedValue(3);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', nome: 'Renata' },
        { id: 'u2', nome: 'Marcos' },
      ]);

      const resultado = await servicoCom(prisma).findAll(
        query({ empresaId: 'e1' }),
      );

      expect(resultado.data.map((i) => i.registradoPor?.nome)).toEqual([
        'Renata',
        'Renata',
        'Marcos',
      ]);
      // Uma consulta só, com os ids sem repetir: linha do tempo é lista longa, e
      // uma consulta por item viraria N+1 na tela mais visitada da empresa.
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
      const argUsers = prisma.user.findMany.mock.calls[0][0] as {
        where: { id: { in: string[] } };
        select: Record<string, boolean>;
      };
      expect(argUsers.where.id.in.sort()).toEqual(['u1', 'u2']);
      // select explícito, nunca include cru em User: é a regra que nasceu do
      // vazamento de senhaHash e codigoConvite.
      expect(argUsers.select).toEqual({ id: true, nome: true });
    });

    it('não consulta usuário nenhum quando a página está vazia', async () => {
      const prisma = criarMockPrisma();
      prisma.interacao.findMany.mockResolvedValue([]);
      prisma.interacao.count.mockResolvedValue(0);

      const resultado = await servicoCom(prisma).findAll(
        query({ projetoId: 'p1' }),
      );

      expect(resultado.data).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('registro cujo autor sumiu do sistema não quebra a linha do tempo', async () => {
      const prisma = criarMockPrisma();
      prisma.interacao.findMany.mockResolvedValue([
        { id: 'i1', resumo: 'Contato antigo', criadoPorId: 'apagado' },
      ]);
      prisma.interacao.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([]);

      const resultado = await servicoCom(prisma).findAll(
        query({ empresaId: 'e1' }),
      );

      expect(resultado.data[0].registradoPor).toBeNull();
    });
  });

  describe('create', () => {
    it('recusa interação solta, sem vínculo nenhum', async () => {
      const prisma = criarMockPrisma();
      await expect(
        servicoCom(prisma).create({ tipo: 'LIGACAO', resumo: 'oi' } as never),
      ).rejects.toThrow(/ao menos um vínculo/i);
      expect(prisma.interacao.create).not.toHaveBeenCalled();
    });

    it('recusa vínculo com empresa que não existe', async () => {
      const prisma = criarMockPrisma();
      prisma.empresaCliente.findUnique.mockResolvedValue(null);

      await expect(
        servicoCom(prisma).create({
          tipo: 'LIGACAO',
          resumo: 'oi',
          empresaId: 'nao-existe',
        } as never),
      ).rejects.toThrow(/Empresa não encontrada/);
      expect(prisma.interacao.create).not.toHaveBeenCalled();
    });

    it('grava o contato com a data informada', async () => {
      const prisma = criarMockPrisma();
      prisma.empresaCliente.findUnique.mockResolvedValue({ id: 'e1' });
      prisma.interacao.create.mockResolvedValue({ id: 'i1' });

      await servicoCom(prisma).create({
        tipo: 'REUNIAO',
        resumo: 'Alinhamento do dossiê',
        data: '2026-08-01T12:00:00.000Z',
        empresaId: 'e1',
      } as never);

      const arg = prisma.interacao.create.mock.calls[0][0] as {
        data: { data: Date; tipo: string; empresaId: string };
      };
      expect(arg.data.tipo).toBe('REUNIAO');
      expect(arg.data.empresaId).toBe('e1');
      expect(arg.data.data.toISOString()).toBe('2026-08-01T12:00:00.000Z');
    });
  });
});
