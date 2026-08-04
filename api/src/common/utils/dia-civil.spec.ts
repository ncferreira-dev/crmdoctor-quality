import { diasEntre, inicioDoDiaCivil } from './dia-civil';

// A fórmula que estava no cron até 04/08/2026. Fica aqui para o teste medir o
// erro em vez de só afirmar que ele existia.
function inicioDoDiaUTC(agora: Date): Date {
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
}

const DIA = 24 * 60 * 60 * 1000;

describe('inicioDoDiaCivil', () => {
  it('no horário do cron agendado (8h de Brasília) UTC e Brasil concordam', () => {
    // 8h em Brasília é 11h UTC, mesmo dia dos dois lados.
    const agora = new Date('2026-08-05T11:00:00.000Z');
    expect(inicioDoDiaCivil(agora).toISOString()).toBe(
      '2026-08-05T00:00:00.000Z',
    );
    expect(inicioDoDiaUTC(agora).toISOString()).toBe(
      '2026-08-05T00:00:00.000Z',
    );
  });

  it('perto da meia-noite de Brasília o UTC já virou, e o dia civil não', () => {
    // 23h30 de 04/08 em Brasília é 02h30 de 05/08 em UTC.
    const agora = new Date('2026-08-05T02:30:00.000Z');
    expect(inicioDoDiaCivil(agora).toISOString()).toBe(
      '2026-08-04T00:00:00.000Z',
    );
    // Prova do defeito antigo: um dia inteiro de diferença.
    expect(
      inicioDoDiaUTC(agora).getTime() - inicioDoDiaCivil(agora).getTime(),
    ).toBe(DIA);
  });

  it('na virada do mês o erro antigo trocava agosto por setembro', () => {
    // 22h de 31/08 em Brasília é 01h de 01/09 em UTC.
    const agora = new Date('2026-09-01T01:00:00.000Z');
    expect(inicioDoDiaCivil(agora).toISOString()).toBe(
      '2026-08-31T00:00:00.000Z',
    );
    expect(inicioDoDiaUTC(agora).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });

  it('na virada do ano vale o mesmo', () => {
    // 22h de 31/12/2026 em Brasília é 01h de 01/01/2027 em UTC.
    const agora = new Date('2027-01-01T01:00:00.000Z');
    expect(inicioDoDiaCivil(agora).toISOString()).toBe(
      '2026-12-31T00:00:00.000Z',
    );
  });

  it('a régua não depende do fuso da máquina que roda o processo', () => {
    // Dois instantes iguais escritos com deslocamentos diferentes têm que dar
    // o mesmo dia civil. Se alguém trocar o Intl por um -3 na mão, isto quebra
    // no horário de verão.
    const a = new Date('2026-08-04T20:00:00.000-03:00');
    const b = new Date('2026-08-04T23:00:00.000Z');
    expect(inicioDoDiaCivil(a).toISOString()).toBe(
      inicioDoDiaCivil(b).toISOString(),
    );
  });
});

describe('diasEntre', () => {
  it('conta dias inteiros entre dois inícios de dia civil', () => {
    const hoje = new Date('2026-08-04T00:00:00.000Z');
    const prazo = new Date('2026-08-16T00:00:00.000Z');
    expect(diasEntre(hoje, prazo)).toBe(12);
  });

  it('prazo de hoje é zero, não um', () => {
    const hoje = new Date('2026-08-04T00:00:00.000Z');
    expect(diasEntre(hoje, hoje)).toBe(0);
  });

  it('atravessa a virada do mês sem perder um dia', () => {
    const hoje = new Date('2026-08-31T00:00:00.000Z');
    const prazo = new Date('2026-09-02T00:00:00.000Z');
    expect(diasEntre(hoje, prazo)).toBe(2);
  });
});
