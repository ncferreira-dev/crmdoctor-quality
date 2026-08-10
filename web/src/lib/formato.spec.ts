import { describe, expect, it } from 'vitest';
import {
  diasAteOPrazo,
  formatarCnpj,
  formatarDataCivil,
  formatarMoeda,
  mascararCnpj,
  textoPrazo,
  urgenciaDoPrazo,
} from './formato';

// Estes testes rodam com TZ=UTC (ver package.json), e isso é o ponto.
//
// `diasAteOPrazo` usava `new Date()` com `setHours(0,0,0,0)`, ou seja, a
// meia-noite da MÁQUINA. Na do Nícolas, em Brasília, a conta batia. Numa em
// UTC, depois das 21h, ela andava um dia inteiro: o prazo de amanhã virava
// "vence hoje" e o de hoje virava "vencido". É a mesma classe de defeito que a
// API já tinha pago para consertar com `inicioDoDiaCivil`.
//
// Rodar a suíte em America/Sao_Paulo esconderia exatamente o que ela existe
// para pegar.
describe('diasAteOPrazo com o relógio da máquina em UTC', () => {
  // 21h de Brasília em 10/08 já é 00h de 11/08 em UTC. O dia civil brasileiro
  // ainda é 10.
  const NOITE_DE_BRASILIA = new Date('2026-08-11T00:30:00.000Z');

  it('às 21h30 de Brasília, o prazo de amanhã ainda vence amanhã', () => {
    expect(diasAteOPrazo('2026-08-11', NOITE_DE_BRASILIA)).toBe(1);
    expect(textoPrazo('2026-08-11', NOITE_DE_BRASILIA)).toBe('Vence amanhã');
  });

  it('às 21h30 de Brasília, o prazo de hoje ainda vence hoje', () => {
    expect(diasAteOPrazo('2026-08-10', NOITE_DE_BRASILIA)).toBe(0);
    expect(textoPrazo('2026-08-10', NOITE_DE_BRASILIA)).toBe('Vence hoje');
  });

  it('o que já passou continua vencido, com a contagem certa', () => {
    expect(diasAteOPrazo('2026-08-07', NOITE_DE_BRASILIA)).toBe(-3);
    expect(textoPrazo('2026-08-07', NOITE_DE_BRASILIA)).toBe('Vencido há 3 dias');
  });

  it('de manhã em Brasília a conta é a mesma', () => {
    const manha = new Date('2026-08-10T13:00:00.000Z');
    expect(diasAteOPrazo('2026-08-11', manha)).toBe(1);
    expect(diasAteOPrazo('2026-08-10', manha)).toBe(0);
  });

  it('aceita o ISO completo que a API devolve, sem deslocar o dia', () => {
    expect(diasAteOPrazo('2026-08-16T00:00:00.000Z', NOITE_DE_BRASILIA)).toBe(6);
  });

  it('atravessa a virada de mês sem pular', () => {
    const ultimoDia = new Date('2026-09-01T01:00:00.000Z'); // 31/08 22h em Brasília
    expect(diasAteOPrazo('2026-09-01', ultimoDia)).toBe(1);
    expect(diasAteOPrazo('2026-08-31', ultimoDia)).toBe(0);
  });
});

// A régua de urgência tem que ser a MESMA do cron da API (15 dias), senão a
// tela pinta de alerta o que a notificação não avisou, ou o contrário.
describe('urgenciaDoPrazo', () => {
  const HOJE = new Date('2026-08-10T13:00:00.000Z');

  it('classifica pelas mesmas faixas do alerta automático', () => {
    expect(urgenciaDoPrazo('2026-08-09', HOJE)).toBe('vencido');
    expect(urgenciaDoPrazo('2026-08-10', HOJE)).toBe('critico');
    expect(urgenciaDoPrazo('2026-08-17', HOJE)).toBe('critico');
    expect(urgenciaDoPrazo('2026-08-18', HOJE)).toBe('proximo');
    expect(urgenciaDoPrazo('2026-08-25', HOJE)).toBe('proximo');
    expect(urgenciaDoPrazo('2026-08-26', HOJE)).toBe('tranquilo');
  });

  it('sem prazo não é urgência nenhuma, e não é "tranquilo"', () => {
    expect(urgenciaDoPrazo(null, HOJE)).toBe('sem-prazo');
  });
});

describe('formatarDataCivil', () => {
  // Campo @db.Date não tem hora. Converter para o fuso local joga o instante
  // para o dia anterior, e foi assim que datas apareceram um dia atrasadas.
  it('lê a data da string e não passa por fuso', () => {
    expect(formatarDataCivil('2026-08-16')).toBe('16/08/2026');
    expect(formatarDataCivil('2026-08-16T00:00:00.000Z')).toBe('16/08/2026');
    expect(formatarDataCivil('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
  });
});

describe('formatarMoeda', () => {
  it('sem centavos por padrão, com centavos quando pedido', () => {
    expect(formatarMoeda(45000)).toContain('45.000');
    expect(formatarMoeda(45000)).not.toContain(',00');
    expect(formatarMoeda(45000, { comCentavos: true })).toContain('45.000,00');
  });

  it('trata ausência de valor como zero, e não como texto vazio', () => {
    expect(formatarMoeda(null)).toContain('0');
    expect(formatarMoeda(undefined)).toContain('0');
  });
});

describe('CNPJ', () => {
  it('mostra com máscara o que é guardado só com dígito', () => {
    expect(formatarCnpj('33000167000101')).toBe('33.000.167/0001-01');
    expect(formatarCnpj(null)).toBe('');
  });

  it('vai pontuando conforme a pessoa digita, e apagar continua funcionando', () => {
    expect(mascararCnpj('33')).toBe('33');
    expect(mascararCnpj('33000')).toBe('33.000');
    expect(mascararCnpj('33000167')).toBe('33.000.167');
    expect(mascararCnpj('330001670001')).toBe('33.000.167/0001');
    expect(mascararCnpj('33000167000101')).toBe('33.000.167/0001-01');
    // Passa do tamanho: para no 14º dígito em vez de aceitar lixo.
    expect(mascararCnpj('330001670001019999')).toBe('33.000.167/0001-01');
  });
});
