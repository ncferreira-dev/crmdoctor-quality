import {
  calcularPrazoLimite,
  comCamposCalculados,
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
