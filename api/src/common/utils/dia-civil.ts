// Fuso do prazo de compliance.
//
// O problema: campo `@db.Date` (Projeto.dataLimiteCompliance, EtapaProjeto.prazo,
// Tarefa.prazo) não guarda hora nem fuso. O Prisma devolve cada um como a
// meia-noite UTC daquela data civil: 16/08/2026 chega como
// `2026-08-16T00:00:00.000Z`. Para comparar prazo com "hoje" sem erro de um dia,
// os dois lados da conta precisam estar na mesma régua: meia-noite UTC do dia
// civil brasileiro.
//
// `new Date()` não serve: entre 21h e 23h59 de Brasília o relógio UTC já virou
// para o dia seguinte. Um container que sobe às 22h calcularia "hoje" como
// amanhã, e todo prazo sairia com um dia a menos na frase "vence em N dias".
// Como a notificação é gravada com o texto pronto e o `@@unique` impede
// regravar, o número errado ficaria congelado até o prazo mudar.
//
// Por isso a data civil vem do Intl, que é quem sabe o horário de verão e as
// mudanças de fuso do Brasil, e não de um `-3` fixo no código.
export const FUSO_BRASIL = 'America/Sao_Paulo';

const FORMATO_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_BRASIL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Devolve a meia-noite UTC do dia civil brasileiro correspondente a `agora`.
 * É a régua para comparar com qualquer campo `@db.Date`.
 */
export function inicioDoDiaCivil(agora: Date = new Date()): Date {
  // en-CA formata como YYYY-MM-DD, que é o que o construtor de Date lê como UTC.
  return new Date(`${FORMATO_ISO.format(agora)}T00:00:00.000Z`);
}

/**
 * Diferença em dias inteiros entre dois marcos de dia civil. Os dois argumentos
 * têm que estar na régua de `inicioDoDiaCivil`, senão a conta volta a ter erro
 * de fuso.
 */
export function diasEntre(de: Date, ate: Date): number {
  const UM_DIA = 24 * 60 * 60 * 1000;
  return Math.round((ate.getTime() - de.getTime()) / UM_DIA);
}
