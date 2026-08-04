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
    cronExecucao: { upsert: jest.fn() },
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

  it('registra o heartbeat só DEPOIS da verificação terminar', async () => {
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockResolvedValue([]);
    prisma.etapaProjeto.findMany.mockResolvedValue([]);

    await servicoCom(prisma).executarCronCompliance();

    const arg = prisma.cronExecucao.upsert.mock.calls[0][0] as {
      where: { nome: string };
      create: { executadoEm: Date };
    };
    expect(arg.where.nome).toBe('compliance-prazos');
    expect(arg.create.executadoEm).toBeInstanceOf(Date);
  });

  it('NÃO registra heartbeat quando a verificação falha', async () => {
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockRejectedValue(new Error('banco fora'));
    prisma.etapaProjeto.findMany.mockResolvedValue([]);

    await expect(servicoCom(prisma).executarCronCompliance()).rejects.toThrow();
    // É o contrato do /health/cron: carimbo parado = alerta. Se o carimbo
    // avançasse em execução falhada, o monitor nunca acusaria nada.
    expect(prisma.cronExecucao.upsert).not.toHaveBeenCalled();
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

// O cron roda no boot do container, e deploy à noite acontece. Entre 21h e
// 23h59 de Brasília o relógio UTC já está no dia seguinte, e é aí que a conta
// de "vence em N dias" errava por um dia. A frase fica gravada na notificação e
// o @@unique impede regravar, então o número errado sobrevive até o prazo mudar.
describe('NotificacoesService — janela e contagem no fuso de Brasília', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  async function rodarEm(instante: string, prazo: string) {
    jest.useFakeTimers().setSystemTime(new Date(instante));
    const prisma = criarMockPrisma();
    prisma.projeto.findMany.mockResolvedValue([
      {
        id: 'p1',
        titulo: 'Auditoria FDA',
        // Campo @db.Date volta do Prisma como meia-noite UTC do dia civil.
        dataLimiteCompliance: new Date(prazo),
        empresa: { nome: 'Clínica X' },
      },
    ]);
    prisma.etapaProjeto.findMany.mockResolvedValue([]);
    prisma.notificacao.createMany.mockResolvedValue({ count: 1 });

    await servicoCom(prisma).verificarPrazosCompliance();

    const where = (
      prisma.projeto.findMany.mock.calls[0][0] as {
        where: { dataLimiteCompliance: { gte: Date; lte: Date } };
      }
    ).where;
    const arg = prisma.notificacao.createMany.mock.calls[0][0] as CreateManyArg;
    return { inicioDaJanela: where.dataLimiteCompliance.gte, arg };
  }

  it('às 23h30 de Brasília ainda conta a partir de hoje, não de amanhã', async () => {
    // 04/08 23h30 em Brasília, que em UTC já é 05/08 02h30.
    const { inicioDaJanela, arg } = await rodarEm(
      '2026-08-05T02:30:00.000Z',
      '2026-08-16T00:00:00.000Z',
    );

    expect(inicioDaJanela.toISOString()).toBe('2026-08-04T00:00:00.000Z');
    // De 04/08 para 16/08 são 12 dias. A fórmula antiga diria 11.
    expect(arg.data[0].mensagem).toContain('vence em 12 dias');
  });

  it('na virada do mês o alerta não pula para o mês seguinte', async () => {
    // 31/08 22h em Brasília, que em UTC já é 01/09 01h.
    const { inicioDaJanela, arg } = await rodarEm(
      '2026-09-01T01:00:00.000Z',
      '2026-09-10T00:00:00.000Z',
    );

    expect(inicioDaJanela.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(arg.data[0].mensagem).toContain('vence em 10 dias');
  });

  it('no horário do cron agendado (8h de Brasília) nada muda', async () => {
    const { inicioDaJanela, arg } = await rodarEm(
      '2026-08-05T11:00:00.000Z',
      '2026-08-16T00:00:00.000Z',
    );

    expect(inicioDaJanela.toISOString()).toBe('2026-08-05T00:00:00.000Z');
    expect(arg.data[0].mensagem).toContain('vence em 11 dias');
  });

  it('prazo que vence hoje continua dentro da janela, e não vira "vence em -1"', async () => {
    // 04/08 23h30 em Brasília, prazo hoje (04/08).
    const { inicioDaJanela, arg } = await rodarEm(
      '2026-08-05T02:30:00.000Z',
      '2026-08-04T00:00:00.000Z',
    );

    expect(inicioDaJanela.toISOString()).toBe('2026-08-04T00:00:00.000Z');
    expect(arg.data[0].mensagem).toContain('vence em 0 dias');
  });
});
