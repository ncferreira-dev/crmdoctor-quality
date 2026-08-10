import { describe, expect, it } from 'vitest';
import { agruparPorUrgencia, prazosPorDia } from './tarefas';
import { Projeto, Tarefa } from '../types';

// Também em TZ=UTC: o agrupamento chama diasAteOPrazo, então ele herda o mesmo
// risco de virada de dia que o item 24 consertou.
const NOITE_DE_BRASILIA = new Date('2026-08-11T00:30:00.000Z'); // 10/08, 21h30 daqui

function tarefa(parcial: Partial<Tarefa> & { id: string }): Tarefa {
  return {
    titulo: `Tarefa ${parcial.id}`,
    descricao: null,
    status: 'PENDENTE',
    prazo: null,
    projetoId: null,
    responsavelId: 'u1',
    criadoEm: '2026-08-01T12:00:00.000Z',
    ...parcial,
  } as Tarefa;
}

describe('agruparPorUrgencia', () => {
  it('separa por urgência e não por status', () => {
    const grupos = agruparPorUrgencia(
      [
        tarefa({ id: 'atrasada', prazo: '2026-08-05' }),
        tarefa({ id: 'hoje', prazo: '2026-08-10' }),
        tarefa({ id: 'depois', prazo: '2026-08-20' }),
        tarefa({ id: 'sem-prazo' }),
        tarefa({ id: 'feita', prazo: '2026-08-05', status: 'CONCLUIDA' }),
      ],
      NOITE_DE_BRASILIA,
    );

    const porChave = Object.fromEntries(
      grupos.map((g) => [g.chave, g.tarefas.map((t) => t.id)]),
    );
    expect(porChave).toEqual({
      atrasadas: ['atrasada'],
      hoje: ['hoje'],
      proximas: ['depois'],
      'sem-prazo': ['sem-prazo'],
      concluidas: ['feita'],
    });
  });

  // Tarefa concluída com prazo vencido não é uma tarefa atrasada: ela está
  // pronta. Misturar as duas coisas encheria o grupo mais urgente de trabalho
  // que já acabou.
  it('concluída com prazo vencido não entra em Atrasadas', () => {
    const grupos = agruparPorUrgencia(
      [tarefa({ id: 'feita', prazo: '2026-01-01', status: 'CONCLUIDA' })],
      NOITE_DE_BRASILIA,
    );
    expect(grupos.map((g) => g.chave)).toEqual(['concluidas']);
  });

  it('grupo vazio não aparece na tela', () => {
    const grupos = agruparPorUrgencia([tarefa({ id: 'so-uma' })], NOITE_DE_BRASILIA);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].chave).toBe('sem-prazo');
  });

  it('a lista vazia não vira grupo nenhum', () => {
    expect(agruparPorUrgencia([], NOITE_DE_BRASILIA)).toEqual([]);
  });
});

function projeto(parcial: Partial<Projeto> & { id: string }): Projeto {
  return {
    titulo: `Projeto ${parcial.id}`,
    empresaId: 'e1',
    estagio: 'EXECUCAO',
    dataLimiteCompliance: '2026-08-16T00:00:00.000Z',
    ...parcial,
  } as Projeto;
}

describe('prazosPorDia', () => {
  const PROJETOS = [
    projeto({ id: 'a', empresaId: 'e1', titulo: 'Adequação BPF' }),
    projeto({ id: 'b', empresaId: 'e2', titulo: 'Registro dermocosmético' }),
    projeto({ id: 'c', empresaId: 'e1', estagio: 'CONCLUIDO' }),
    projeto({ id: 'd', empresaId: 'e1', dataLimiteCompliance: null }),
  ];

  it('só entra projeto com prazo e fora de concluído', () => {
    const mapa = prazosPorDia(PROJETOS);
    expect([...mapa.values()].flat().map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  // Era o defeito medido: filtrando por uma empresa, as visitas caíam de 7 para
  // 2 e as marcas de prazo continuavam lá, inclusive de outras empresas.
  it('o filtro de empresa vale para o prazo também', () => {
    const mapa = prazosPorDia(PROJETOS, { empresaId: 'e1' });
    expect([...mapa.values()].flat().map((p) => p.id)).toEqual(['a']);
  });

  it('a busca alcança título e nome da empresa', () => {
    expect([...prazosPorDia(PROJETOS, { busca: 'dermo' }).values()].flat()).toHaveLength(1);
    expect([...prazosPorDia(PROJETOS, { busca: 'nada disso' }).values()]).toHaveLength(0);
  });

  // Ninguém é responsável por uma data vencer, e prazo não fica "confirmado".
  // Com esses filtros ativos a pessoa pediu uma lista de visitas.
  it('filtro de consultor ou de status tira o prazo de cena', () => {
    expect(prazosPorDia(PROJETOS, { consultorId: 'u1' }).size).toBe(0);
    expect(prazosPorDia(PROJETOS, { status: 'AGENDADA' }).size).toBe(0);
  });

  it('agrupa pela data civil, sem deslocar pelo fuso', () => {
    const mapa = prazosPorDia([projeto({ id: 'a' })]);
    expect([...mapa.keys()]).toEqual(['2026-08-16']);
  });
});
