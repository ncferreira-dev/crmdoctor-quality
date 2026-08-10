import { NotificacoesService } from './notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock só dos métodos do Prisma que o serviço toca. Não valida as constraints
// do banco (isso é da migration), mas trava a janela, a regra de destinatário,
// a leitura por pessoa e o skipDuplicates, que é o mecanismo de idempotência no
// nível do serviço.
// jest.fn() nasce com tipo `any`, e ler `mock.calls[0][0]` dele é acesso
// inseguro: o `as` que vem logo depois passaria a mentir sem ninguém perceber
// se a chamada mudasse. Declarar o argumento como `unknown` mantém a leitura
// tipada e obriga o cast explícito que os testes já fazem.
const metodoPrisma = () => jest.fn<Promise<unknown>, [unknown]>();

function criarMockPrisma() {
  return {
    projeto: { findMany: metodoPrisma() },
    etapaProjeto: { findMany: metodoPrisma() },
    notificacao: { createMany: metodoPrisma(), findMany: metodoPrisma() },
    notificacaoDestinatario: {
      createMany: metodoPrisma(),
      findMany: metodoPrisma(),
      findUnique: metodoPrisma(),
      update: metodoPrisma(),
      count: metodoPrisma(),
    },
    user: { findMany: metodoPrisma() },
    cronExecucao: { upsert: metodoPrisma() },
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

// Estado padrão: nada a fazer. Cada teste sobrescreve só o que lhe interessa.
function semNada(prisma: MockPrisma) {
  prisma.projeto.findMany.mockResolvedValue([]);
  prisma.etapaProjeto.findMany.mockResolvedValue([]);
  prisma.notificacao.findMany.mockResolvedValue([]);
  prisma.notificacao.createMany.mockResolvedValue({ count: 0 });
  prisma.notificacaoDestinatario.createMany.mockResolvedValue({ count: 0 });
  prisma.user.findMany.mockResolvedValue([]);
}

const DIA = 24 * 60 * 60 * 1000;

describe('NotificacoesService — janela do cron', () => {
  it('busca por um teto de 15 dias e SEM piso, para o prazo vencido continuar cobrando', async () => {
    const prisma = criarMockPrisma();
    semNada(prisma);

    await servicoCom(prisma).verificarPrazosCompliance();

    const whereProjeto = (
      prisma.projeto.findMany.mock.calls[0][0] as {
        where: {
          dataLimiteCompliance: { gte?: Date; lte: Date };
          estagio: unknown;
        };
      }
    ).where;

    // O piso era `gte: hoje`, e era ele que tirava da busca justamente o prazo
    // que já venceu: o sistema parava de falar do problema no dia em que ele
    // virou problema.
    expect(whereProjeto.dataLimiteCompliance.gte).toBeUndefined();
    expect(whereProjeto.dataLimiteCompliance.lte).toBeInstanceOf(Date);
    expect(whereProjeto.estagio).toEqual({ not: 'CONCLUIDO' });

    const whereEtapa = (
      prisma.etapaProjeto.findMany.mock.calls[0][0] as {
        where: { prazo: { gte?: Date; lte: Date }; status: unknown };
      }
    ).where;
    expect(whereEtapa.prazo.gte).toBeUndefined();
    expect(whereEtapa.status).toEqual({ not: 'CONCLUIDA' });
  });

  it('registra o heartbeat só DEPOIS da verificação terminar', async () => {
    const prisma = criarMockPrisma();
    semNada(prisma);

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
    semNada(prisma);
    prisma.projeto.findMany.mockRejectedValue(new Error('banco fora'));

    await expect(servicoCom(prisma).executarCronCompliance()).rejects.toThrow();
    // É o contrato do /health/cron: carimbo parado = alerta. Se o carimbo
    // avançasse em execução falhada, o monitor nunca acusaria nada.
    expect(prisma.cronExecucao.upsert).not.toHaveBeenCalled();
  });

  it('não cria nada quando não há prazos na janela', async () => {
    const prisma = criarMockPrisma();
    semNada(prisma);

    const resultado = await servicoCom(prisma).verificarPrazosCompliance();

    expect(resultado).toEqual({
      criadas: 0,
      projetos: 0,
      etapas: 0,
      destinatarios: 0,
    });
    expect(prisma.notificacao.createMany).not.toHaveBeenCalled();
  });
});

// O teto da janela é calculado a partir do dia civil de Brasília. O cron roda
// no boot do container, e deploy à noite acontece: entre 21h e 23h59 daqui o
// relógio UTC já está no dia seguinte, e a janela inteira andava um dia.
describe('NotificacoesService — o teto respeita o dia civil de Brasília', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  async function tetoEm(instante: string): Promise<Date> {
    jest.useFakeTimers().setSystemTime(new Date(instante));
    const prisma = criarMockPrisma();
    semNada(prisma);
    await servicoCom(prisma).verificarPrazosCompliance();
    return (
      prisma.projeto.findMany.mock.calls[0][0] as {
        where: { dataLimiteCompliance: { lte: Date } };
      }
    ).where.dataLimiteCompliance.lte;
  }

  it('às 23h30 de Brasília o teto ainda conta a partir de hoje, não de amanhã', async () => {
    // 04/08 23h30 em Brasília, que em UTC já é 05/08 02h30. Contando de 04/08,
    // o teto é 19/08. Pelo relógio UTC seria 20/08, e um prazo em 20/08 entraria
    // no alerta um dia antes do que deveria.
    const teto = await tetoEm('2026-08-05T02:30:00.000Z');
    expect(teto.toISOString()).toBe('2026-08-19T00:00:00.000Z');
  });

  it('na virada do mês o teto não pula para o mês seguinte', async () => {
    // 31/08 22h em Brasília, que em UTC já é 01/09 01h.
    const teto = await tetoEm('2026-09-01T01:00:00.000Z');
    expect(teto.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('no horário do cron agendado (8h de Brasília) nada muda', async () => {
    const teto = await tetoEm('2026-08-05T11:00:00.000Z');
    expect(teto.toISOString()).toBe('2026-08-20T00:00:00.000Z');
  });
});

describe('NotificacoesService — a mensagem guarda o fato, não a contagem', () => {
  it('alerta de projeto não grava número de dias no texto', async () => {
    const prisma = criarMockPrisma();
    semNada(prisma);
    prisma.projeto.findMany.mockResolvedValue([
      {
        id: 'p1',
        titulo: 'Auditoria FDA',
        dataLimiteCompliance: new Date(Date.now() + 10 * DIA),
        empresa: { nome: 'Clínica X' },
      },
    ]);
    prisma.notificacao.createMany.mockResolvedValue({ count: 1 });

    const resultado = await servicoCom(prisma).verificarPrazosCompliance();

    expect(resultado.projetos).toBe(1);
    const arg = prisma.notificacao.createMany.mock.calls[0][0] as CreateManyArg;
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data[0]).toMatchObject({
      tipo: 'COMPLIANCE_PRAZO',
      projetoId: 'p1',
    });
    const mensagem = arg.data[0].mensagem as string;
    expect(mensagem).toContain('Auditoria FDA');
    expect(mensagem).toContain('Clínica X');
    // O texto é gravado uma vez e o @@unique impede regravar. Qualquer contagem
    // escrita aqui congela: era assim que o dashboard anunciava "vence em 9
    // dias" ao lado de uma data que faltavam 4.
    expect(mensagem).not.toMatch(/\d+\s*dias?/);
    expect(mensagem).not.toContain('vence');
  });

  it('alerta de etapa NÃO preenche projetoId (senão colide no índice único de projetos)', async () => {
    const prisma = criarMockPrisma();
    semNada(prisma);
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
    expect(arg.data[0]).toMatchObject({
      tipo: 'COMPLIANCE_ETAPA',
      etapaId: 'e1',
    });
    expect(arg.data[0]).not.toHaveProperty('projetoId');
    expect(arg.data[0].mensagem as string).not.toMatch(/\d+\s*dias?/);
  });
});

// A razão de ser deste módulo depois de 09/08/2026: o alerta deixou de ser da
// empresa e passou a ter dono.
describe('NotificacoesService — regra de destinatário', () => {
  async function destinatariosDe(
    notificacoes: unknown[],
    usuariosDoUltimoRecurso: { id: string }[] = [],
  ) {
    const prisma = criarMockPrisma();
    semNada(prisma);
    prisma.notificacao.findMany.mockResolvedValue(notificacoes);
    prisma.user.findMany.mockResolvedValue(usuariosDoUltimoRecurso);
    prisma.notificacaoDestinatario.createMany.mockResolvedValue({ count: 1 });

    await servicoCom(prisma).verificarPrazosCompliance();

    const chamada = prisma.notificacaoDestinatario.createMany.mock.calls[0];
    return {
      linhas: chamada ? (chamada[0] as CreateManyArg) : null,
      buscouUltimoRecurso: prisma.user.findMany.mock.calls.length > 0,
    };
  }

  it('marco com responsável vai só para o responsável', async () => {
    const { linhas, buscouUltimoRecurso } = await destinatariosDe([
      {
        id: 'n1',
        projeto: null,
        etapa: {
          excluidoEm: null,
          responsavelId: 'u-responsavel',
          projeto: {
            excluidoEm: null,
            equipe: [{ id: 'u-equipe-1' }, { id: 'u-equipe-2' }],
          },
        },
      },
    ]);

    expect(linhas?.data).toEqual([
      { notificacaoId: 'n1', usuarioId: 'u-responsavel' },
    ]);
    // A equipe existe e não foi usada: responsável ganha do resto de propósito.
    expect(buscouUltimoRecurso).toBe(false);
  });

  it('marco sem responsável cai para a equipe do projeto', async () => {
    const { linhas, buscouUltimoRecurso } = await destinatariosDe([
      {
        id: 'n1',
        projeto: null,
        etapa: {
          excluidoEm: null,
          responsavelId: null,
          projeto: {
            excluidoEm: null,
            equipe: [{ id: 'u-equipe-1' }, { id: 'u-equipe-2' }],
          },
        },
      },
    ]);

    expect(linhas?.data).toEqual([
      { notificacaoId: 'n1', usuarioId: 'u-equipe-1' },
      { notificacaoId: 'n1', usuarioId: 'u-equipe-2' },
    ]);
    expect(buscouUltimoRecurso).toBe(false);
  });

  it('alerta de projeto vai para a equipe do projeto', async () => {
    const { linhas } = await destinatariosDe([
      {
        id: 'n1',
        etapa: null,
        projeto: { excluidoEm: null, equipe: [{ id: 'u-equipe-1' }] },
      },
    ]);

    expect(linhas?.data).toEqual([
      { notificacaoId: 'n1', usuarioId: 'u-equipe-1' },
    ]);
  });

  it('projeto sem equipe cai no último recurso, para o prazo não ficar sem dono', async () => {
    const { linhas, buscouUltimoRecurso } = await destinatariosDe(
      [{ id: 'n1', etapa: null, projeto: { excluidoEm: null, equipe: [] } }],
      [{ id: 'u-gestor' }],
    );

    expect(buscouUltimoRecurso).toBe(true);
    expect(linhas?.data).toEqual([
      { notificacaoId: 'n1', usuarioId: 'u-gestor' },
    ]);
  });

  it('projeto apagado não gera destinatário nenhum', async () => {
    const { linhas } = await destinatariosDe([
      {
        id: 'n1',
        etapa: null,
        projeto: { excluidoEm: new Date(), equipe: [{ id: 'u-equipe-1' }] },
      },
    ]);

    expect(linhas).toBeNull();
  });

  it('reconcilia a janela inteira e não só o que acabou de nascer', async () => {
    const prisma = criarMockPrisma();
    semNada(prisma);
    // Nenhuma notificação nova nesta rodada, mas uma antiga na janela.
    prisma.notificacao.findMany.mockResolvedValue([
      {
        id: 'n-antiga',
        etapa: null,
        projeto: { excluidoEm: null, equipe: [{ id: 'u-entrou-depois' }] },
      },
    ]);
    prisma.notificacaoDestinatario.createMany.mockResolvedValue({ count: 1 });

    const resultado = await servicoCom(prisma).verificarPrazosCompliance();

    // Quem entrou na equipe depois passa a receber o alerta que já existia.
    expect(resultado.criadas).toBe(0);
    expect(resultado.destinatarios).toBe(1);
    const arg = prisma.notificacaoDestinatario.createMany.mock
      .calls[0][0] as CreateManyArg;
    expect(arg.skipDuplicates).toBe(true);
  });
});

describe('NotificacoesService — leitura é de uma pessoa', () => {
  it('findAll devolve só o que é daquela pessoa, com a leitura dela', async () => {
    const prisma = criarMockPrisma();
    prisma.notificacaoDestinatario.findMany.mockResolvedValue([
      {
        lidaEm: null,
        notificacao: { id: 'n1', tipo: 'COMPLIANCE_PRAZO', mensagem: 'x' },
      },
      {
        lidaEm: new Date('2026-08-09T12:00:00.000Z'),
        notificacao: { id: 'n2', tipo: 'COMPLIANCE_ETAPA', mensagem: 'y' },
      },
    ]);

    const lista = await servicoCom(prisma).findAll('u1', {});

    const where = (
      prisma.notificacaoDestinatario.findMany.mock.calls[0][0] as {
        where: { usuarioId: string };
      }
    ).where;
    expect(where.usuarioId).toBe('u1');
    expect(lista[0]).toMatchObject({ id: 'n1', lida: false });
    expect(lista[1]).toMatchObject({ id: 'n2', lida: true });
  });

  it('filtro lida=false procura por lidaEm nulo, não pelo campo antigo', async () => {
    const prisma = criarMockPrisma();
    prisma.notificacaoDestinatario.findMany.mockResolvedValue([]);

    await servicoCom(prisma).findAll('u1', { lida: false });

    const where = prisma.notificacaoDestinatario.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.where).toMatchObject({ usuarioId: 'u1', lidaEm: null });
    expect(where.where).not.toHaveProperty('lida');
  });

  it('marcar como lida carimba a linha da pessoa, e não a notificação', async () => {
    const prisma = criarMockPrisma();
    prisma.notificacaoDestinatario.findUnique.mockResolvedValue({
      id: 'd1',
      lidaEm: null,
    });
    prisma.notificacaoDestinatario.update.mockResolvedValue({ id: 'd1' });

    await servicoCom(prisma).marcarLida('n1', 'u1');

    const chave = prisma.notificacaoDestinatario.findUnique.mock
      .calls[0][0] as {
      where: {
        notificacaoId_usuarioId: { notificacaoId: string; usuarioId: string };
      };
    };
    expect(chave.where.notificacaoId_usuarioId).toEqual({
      notificacaoId: 'n1',
      usuarioId: 'u1',
    });
    const update = prisma.notificacaoDestinatario.update.mock.calls[0][0] as {
      where: { id: string };
      data: { lidaEm: Date };
    };
    expect(update.where.id).toBe('d1');
    expect(update.data.lidaEm).toBeInstanceOf(Date);
  });

  it('quem não é destinatário recebe 404, porque o alerta não é dele', async () => {
    const prisma = criarMockPrisma();
    prisma.notificacaoDestinatario.findUnique.mockResolvedValue(null);

    await expect(
      servicoCom(prisma).marcarLida('n1', 'u-estranho'),
    ).rejects.toThrow('Notificação não encontrada');
    expect(prisma.notificacaoDestinatario.update).not.toHaveBeenCalled();
  });

  it('marcar duas vezes não reescreve o carimbo da primeira', async () => {
    const prisma = criarMockPrisma();
    const jaLida = new Date('2026-08-09T12:00:00.000Z');
    prisma.notificacaoDestinatario.findUnique.mockResolvedValue({
      id: 'd1',
      lidaEm: jaLida,
    });

    const resultado = (await servicoCom(prisma).marcarLida('n1', 'u1')) as {
      lidaEm: Date;
    };

    expect(resultado.lidaEm).toBe(jaLida);
    expect(prisma.notificacaoDestinatario.update).not.toHaveBeenCalled();
  });
});
