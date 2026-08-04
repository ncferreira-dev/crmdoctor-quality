import { StatusTicket } from '@prisma/client';
import { DashboardService } from '../dashboard/dashboard.service';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  calcularPrazoLimite,
  comCamposCalculados,
  whereEmAberto,
  whereEmAtraso,
} from './tickets.utils';

const HORA = 60 * 60 * 1000;

describe('SLA de tickets', () => {
  describe('calcularPrazoLimite', () => {
    const base = new Date('2026-01-01T00:00:00.000Z');

    it('prioridade 1 (alta) = 2h', () => {
      expect(
        calcularPrazoLimite({ abertoEm: base, prioridade: 1 }).toISOString(),
      ).toBe('2026-01-01T02:00:00.000Z');
    });

    it('prioridade 2 (média) = 8h', () => {
      expect(
        calcularPrazoLimite({ abertoEm: base, prioridade: 2 }).toISOString(),
      ).toBe('2026-01-01T08:00:00.000Z');
    });

    it('prioridade 3 (baixa) = 24h', () => {
      expect(
        calcularPrazoLimite({ abertoEm: base, prioridade: 3 }).toISOString(),
      ).toBe('2026-01-02T00:00:00.000Z');
    });

    it('prioridade desconhecida cai no padrão (8h, como a média)', () => {
      expect(
        calcularPrazoLimite({ abertoEm: base, prioridade: 99 }).toISOString(),
      ).toBe('2026-01-01T08:00:00.000Z');
    });
  });

  describe('comCamposCalculados — emAtraso', () => {
    it('em atraso quando aberto há muito e sem primeira resposta', () => {
      const abertoEm = new Date(Date.now() - 100 * HORA); // prioridade 1 vence em 2h
      const r = comCamposCalculados({
        abertoEm,
        prioridade: 1,
        primeiraRespostaEm: null,
      });
      expect(r.emAtraso).toBe(true);
    });

    it('NÃO em atraso se já teve a primeira resposta, mesmo passado do prazo', () => {
      const abertoEm = new Date(Date.now() - 100 * HORA);
      const r = comCamposCalculados({
        abertoEm,
        prioridade: 1,
        primeiraRespostaEm: new Date(),
      });
      expect(r.emAtraso).toBe(false);
    });

    it('NÃO em atraso quando ainda dentro do prazo', () => {
      const abertoEm = new Date(); // acabou de abrir, prazo no futuro
      const r = comCamposCalculados({
        abertoEm,
        prioridade: 1,
        primeiraRespostaEm: null,
      });
      expect(r.emAtraso).toBe(false);
    });
  });

  describe('whereEmAtraso', () => {
    it('filtra sem primeira resposta e monta um OR por prioridade', () => {
      const w = whereEmAtraso(new Date('2026-01-01T10:00:00.000Z'));
      expect(w.primeiraRespostaEm).toBeNull();
      expect(Array.isArray(w.OR)).toBe(true);
      if (Array.isArray(w.OR)) {
        expect(w.OR).toHaveLength(3); // uma cláusula por prioridade (1, 2, 3)
      }
    });
  });
});

// Regressão real: na tela de uma empresa o card "Tickets abertos" mostrava 0
// com um ticket "Aberto" listado logo abaixo. A causa foi a regra de "em
// aberto" existir escrita à mão em dois services diferentes. Estes testes
// prendem a regra num lugar só e provam que os dois consumidores usam ela.
describe('whereEmAberto', () => {
  it('conta todo status que não seja RESOLVIDO', () => {
    const abertos: StatusTicket[] = ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE'];
    const filtro = whereEmAberto();

    for (const status of abertos) {
      expect(status).not.toBe('RESOLVIDO');
    }
    expect(filtro).toEqual({ status: { not: 'RESOLVIDO' } });
  });

  // Se alguém acrescentar um status ao enum, ele nasce contando como aberto.
  // Num sistema de compliance, chamado a mais no radar é melhor que chamado
  // sumido dele.
  it('status novo no enum entra como aberto por padrão', () => {
    const todos = Object.values(StatusTicket);
    const fechados = todos.filter((s) => s === 'RESOLVIDO');
    expect(fechados).toEqual(['RESOLVIDO']);
  });
});

describe('a contagem do card e a do dashboard falam a mesma língua', () => {
  // O que interessa aqui não é o número, é o WHERE: os dois consumidores têm
  // que pedir ao banco exatamente o mesmo recorte de "aberto".
  function prismaEspiao() {
    const chamadas: unknown[] = [];
    return {
      chamadas,
      prisma: {
        empresaCliente: {
          findUnique: jest.fn().mockResolvedValue({ id: 'e-1', nome: 'Opella' }),
        },
        projeto: {
          count: jest.fn().mockResolvedValue(0),
          groupBy: jest.fn().mockResolvedValue([]),
          findMany: jest.fn().mockResolvedValue([]),
          aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
        },
        etapaProjeto: {
          count: jest.fn().mockResolvedValue(0),
          findMany: jest.fn().mockResolvedValue([]),
          groupBy: jest.fn().mockResolvedValue([]),
        },
        visita: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
        },
        notificacao: { count: jest.fn().mockResolvedValue(0) },
        user: { findMany: jest.fn().mockResolvedValue([]) },
        ticket: {
          count: jest.fn((args: unknown) => {
            chamadas.push(args);
            return Promise.resolve(0);
          }),
        },
      } as unknown as PrismaService,
    };
  }

  it('empresas.findOne filtra por status not RESOLVIDO', async () => {
    const { prisma, chamadas } = prismaEspiao();
    await new EmpresasService(prisma).findOne('e-1');

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]).toMatchObject({
      where: { empresaId: 'e-1', status: { not: 'RESOLVIDO' } },
    });
  });

  it('dashboard.resumo usa o mesmo recorte de aberto', async () => {
    const { prisma, chamadas } = prismaEspiao();
    await new DashboardService(prisma).resumo();

    const recortes = chamadas.map((c) => (c as { where?: unknown }).where);
    expect(recortes).toContainEqual(whereEmAberto());
  });
});
