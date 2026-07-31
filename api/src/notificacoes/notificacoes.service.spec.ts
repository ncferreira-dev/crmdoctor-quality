import { NotificacoesService } from './notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock só dos métodos do Prisma que o cron toca. Não valida a constraint
// @@unique do banco (isso é da migration) — mas trava a lógica de janela, a
// contagem e o skipDuplicates (o mecanismo de idempotência no nível do serviço).
function criarMockPrisma() {
  return {
    projeto: { findMany: jest.fn() },
    etapaProjeto: { findMany: jest.fn() },
    notificacao: { createMany: jest.fn() },
  };
}

type MockPrisma = ReturnType<typeof criarMockPrisma>;

interface CreateManyArg {
  data: Array<Record<string, unknown>>;
  skipDuplicates?: boolean;
}

function servicoCom(prisma: MockPrisma) {
  return new NotificacoesService(prisma as unknown as PrismaService);
}

const DIA = 24 * 60 * 60 * 1000;

describe('NotificacoesService — cron de compliance', () => {
  it('busca projetos e etapas numa janela de exatamente 15 dias, não concluídos', async () => {
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockResolvedValue([]);
    prisma.etapaProjeto.findMany.mockResolvedValue([]);

    await servicoCom(prisma).verificarPrazosCompliance();

    const whereProjeto = (
      prisma.projeto.findMany.mock.calls[0][0] as {
        where: {
          dataLimiteCompliance: { gte: Date; lte: Date };
          estagio: unknown;
        };
      }
    ).where;
    const span =
      whereProjeto.dataLimiteCompliance.lte.getTime() -
      whereProjeto.dataLimiteCompliance.gte.getTime();
    expect(span).toBe(15 * DIA);
    expect(whereProjeto.estagio).toEqual({ not: 'CONCLUIDO' });
  });

  it('não cria nada quando não há prazos vencendo', async () => {
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockResolvedValue([]);
    prisma.etapaProjeto.findMany.mockResolvedValue([]);

    const resultado = await servicoCom(prisma).verificarPrazosCompliance();

    expect(resultado).toEqual({ criadas: 0, projetos: 0, etapas: 0 });
    expect(prisma.notificacao.createMany).not.toHaveBeenCalled();
  });

  it('cria alerta de projeto com skipDuplicates (idempotência) e mensagem descritiva', async () => {
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockResolvedValue([
      {
        id: 'p1',
        titulo: 'Auditoria FDA',
        dataLimiteCompliance: new Date(Date.now() + 10 * DIA),
        empresa: { nome: 'Clínica X' },
      },
    ]);
    prisma.etapaProjeto.findMany.mockResolvedValue([]);
    prisma.notificacao.createMany.mockResolvedValue({ count: 1 });

    const resultado = await servicoCom(prisma).verificarPrazosCompliance();

    expect(resultado.projetos).toBe(1);
    const arg = prisma.notificacao.createMany.mock.calls[0][0] as CreateManyArg;
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data[0]).toMatchObject({
      tipo: 'COMPLIANCE_PRAZO',
      projetoId: 'p1',
    });
    expect(arg.data[0].mensagem).toContain('Auditoria FDA');
    expect(arg.data[0].mensagem).toContain('Clínica X');
  });

  it('alerta de etapa NÃO preenche projetoId (senão colide no índice único de projetos)', async () => {
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockResolvedValue([]);
    prisma.etapaProjeto.findMany.mockResolvedValue([
      {
        id: 'e1',
        nome: 'Coleta de evidências',
        prazo: new Date(Date.now() + 5 * DIA),
        projeto: { titulo: 'Auditoria FDA', empresa: { nome: 'Clínica X' } },
      },
    ]);
    prisma.notificacao.createMany.mockResolvedValue({ count: 1 });

    const resultado = await servicoCom(prisma).verificarPrazosCompliance();

    expect(resultado.etapas).toBe(1);
    const arg = prisma.notificacao.createMany.mock.calls[0][0] as CreateManyArg;
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data[0]).toMatchObject({
      tipo: 'COMPLIANCE_ETAPA',
      etapaId: 'e1',
    });
    expect(arg.data[0]).not.toHaveProperty('projetoId');
  });
});
