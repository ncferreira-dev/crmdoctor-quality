import { describe, expect, it } from 'vitest';
import {
  agruparPorSla,
  caminhoDaBusca,
  contarPorSituacao,
  filtrarPorTexto,
} from './chamados';
import { Ticket } from '../types';

function chamado(parcial: Partial<Ticket> & { id: string }): Ticket {
  return {
    titulo: `Chamado ${parcial.id}`,
    descricao: null,
    status: 'ABERTO',
    prioridade: 2,
    empresaId: 'e1',
    abertoEm: '2026-08-10T12:00:00.000Z',
    primeiraRespostaEm: null,
    criadoEm: '2026-08-10T12:00:00.000Z',
    resolvidoEm: null,
    registradoPor: null,
    prazoLimite: '2026-08-11T12:00:00.000Z',
    emAtraso: false,
    ...parcial,
  } as Ticket;
}

describe('agruparPorSla', () => {
  it('separa por SLA e não por status', () => {
    const grupos = agruparPorSla([
      // Status diz "em andamento", o prazo diz que o cliente está esperando há
      // tempo demais. É o atraso que manda.
      chamado({ id: 'atrasado', status: 'EM_ANDAMENTO', emAtraso: true }),
      chamado({ id: 'novo' }),
      chamado({
        id: 'respondido',
        status: 'EM_ANDAMENTO',
        primeiraRespostaEm: '2026-08-10T13:00:00.000Z',
      }),
      chamado({ id: 'fechado', status: 'RESOLVIDO', resolvidoEm: '2026-08-10T18:00:00.000Z' }),
    ]);

    expect(
      Object.fromEntries(grupos.map((g) => [g.chave, g.chamados.map((c) => c.id)])),
    ).toEqual({
      'em-atraso': ['atrasado'],
      'sem-resposta': ['novo'],
      'em-curso': ['respondido'],
      resolvidos: ['fechado'],
    });
  });

  it('põe o atraso em primeiro e marca só ele como destaque', () => {
    const grupos = agruparPorSla([
      chamado({ id: 'fechado', status: 'RESOLVIDO' }),
      chamado({ id: 'atrasado', emAtraso: true }),
    ]);

    expect(grupos[0].chave).toBe('em-atraso');
    expect(grupos.filter((g) => g.destaque).map((g) => g.chave)).toEqual(['em-atraso']);
  });

  it('não devolve grupo vazio', () => {
    expect(agruparPorSla([chamado({ id: 'so-um' })]).map((g) => g.chave)).toEqual([
      'sem-resposta',
    ]);
    expect(agruparPorSla([])).toEqual([]);
  });

  // Um chamado resolvido depois do prazo continua tendo `emAtraso` verdadeiro
  // vindo da API, porque nunca teve primeira resposta registrada. Ele pertence
  // aos resolvidos: cobrar resposta de chamado fechado é pedir trabalho que já
  // não existe.
  it('resolvido vai para resolvidos mesmo tendo estourado o prazo', () => {
    const grupos = agruparPorSla([
      chamado({ id: 'fechado-tarde', status: 'RESOLVIDO', emAtraso: true }),
    ]);
    expect(grupos.map((g) => g.chave)).toEqual(['resolvidos']);
  });
});

describe('caminhoDaBusca', () => {
  it('traduz cada visão no filtro que a API entende', () => {
    expect(caminhoDaBusca('em-aberto', '')).toBe('/tickets?emAberto=true');
    expect(caminhoDaBusca('em-atraso', '')).toBe('/tickets?emAtraso=true');
    expect(caminhoDaBusca('resolvidos', '')).toBe('/tickets?status=RESOLVIDO');
    expect(caminhoDaBusca('todos', '')).toBe('/tickets');
  });

  it('soma a empresa ao filtro da visão', () => {
    expect(caminhoDaBusca('em-aberto', 'abc')).toBe('/tickets?emAberto=true&empresaId=abc');
    expect(caminhoDaBusca('todos', 'abc')).toBe('/tickets?empresaId=abc');
  });
});

describe('filtrarPorTexto', () => {
  const lista = [
    chamado({ id: '1', titulo: 'Desvio de temperatura', empresa: { id: 'e1', nome: 'Opella' } }),
    chamado({ id: '2', titulo: 'Dossiê atrasado', descricao: 'Cliente cobrou por telefone' }),
  ];

  it('acha por título, por descrição e por nome da empresa', () => {
    expect(filtrarPorTexto(lista, 'temperatura').map((c) => c.id)).toEqual(['1']);
    expect(filtrarPorTexto(lista, 'telefone').map((c) => c.id)).toEqual(['2']);
    expect(filtrarPorTexto(lista, 'opella').map((c) => c.id)).toEqual(['1']);
  });

  it('devolve a lista inteira quando não há termo', () => {
    expect(filtrarPorTexto(lista, '   ')).toHaveLength(2);
  });
});

describe('contarPorSituacao', () => {
  it('conta em aberto e em atraso sem contar o resolvido', () => {
    expect(
      contarPorSituacao([
        chamado({ id: '1', emAtraso: true }),
        chamado({ id: '2' }),
        chamado({ id: '3', status: 'RESOLVIDO', emAtraso: true }),
      ]),
    ).toEqual({ emAberto: 2, emAtraso: 1 });
  });
});
