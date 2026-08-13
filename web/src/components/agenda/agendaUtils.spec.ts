import { describe, expect, it } from 'vitest';
import { chaveDia, diasComCompromisso, janelaDaLista } from './agendaUtils';

// Roda em TZ=UTC, como todo teste do front (ver o script "test"): é o oposto do
// fuso do Brasil, e é onde cálculo de dia costuma quebrar nesta base.

describe('janelaDaLista', () => {
  it('vai do dia de referência até 90 dias à frente', () => {
    const janela = janelaDaLista(new Date(2026, 7, 12)); // 12/08/2026, hora local
    expect(janela).toEqual({ de: '2026-08-12', ate: '2026-11-10' });
  });

  it('atravessa a virada do ano sem se perder', () => {
    expect(janelaDaLista(new Date(2026, 11, 20)).ate).toBe('2027-03-20');
  });
});

describe('diasComCompromisso', () => {
  const janela = { de: '2026-08-10', ate: '2026-08-20' };

  it('junta os dias das três fontes, sem repetir e em ordem', () => {
    const visitas = new Map([['2026-08-15', [1]], ['2026-08-11', [1]]]);
    const tarefas = new Map([['2026-08-15', [1]], ['2026-08-12', [1, 2]]]);
    const prazos = new Map([['2026-08-20', [1]]]);

    expect(diasComCompromisso([visitas, tarefas, prazos], janela)).toEqual([
      '2026-08-11',
      '2026-08-12',
      '2026-08-15',
      '2026-08-20',
    ]);
  });

  // Tarefa e prazo são carregados uma vez, sem recorte de data. Sem a janela, a
  // Lista mostraria entrega do ano passado junto com a visita da semana que vem.
  it('corta o que está fora da janela, dos dois lados', () => {
    const tarefas = new Map([
      ['2025-01-05', [1]],
      ['2026-08-09', [1]],
      ['2026-08-10', [1]],
      ['2026-08-20', [1]],
      ['2026-08-21', [1]],
    ]);

    expect(diasComCompromisso([tarefas], janela)).toEqual([
      '2026-08-10',
      '2026-08-20',
    ]);
  });

  it('ignora dia com lista vazia', () => {
    const visitas = new Map([['2026-08-12', []]]);
    expect(diasComCompromisso([visitas], janela)).toEqual([]);
  });

  it('sem nada em lugar nenhum, devolve lista vazia', () => {
    expect(diasComCompromisso([new Map(), new Map()], janela)).toEqual([]);
  });
});

describe('chaveDia', () => {
  // A chave é montada com os campos locais da data, e não com toISOString: em
  // TZ=UTC as duas coincidem, mas em Brasília o ISO joga a noite para o dia
  // seguinte, e a visita das 21h apareceria no dia errado do calendário.
  it('usa o dia local, não o UTC', () => {
    expect(chaveDia(new Date(2026, 7, 12, 21, 30))).toBe('2026-08-12');
  });
});
