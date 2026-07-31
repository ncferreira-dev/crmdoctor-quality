import { Visita } from '../../types';

// Chave de dia YYYY-MM-DD no fuso local do navegador (America/Sao_Paulo para o
// usuário). Usada pra agrupar visitas por dia no calendário.
export function chaveDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function horaMinuto(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Agrupa visitas por dia (chave local), cada grupo ordenado por horário.
export function agruparPorDia(visitas: Visita[]): Map<string, Visita[]> {
  const mapa = new Map<string, Visita[]>();
  for (const visita of visitas) {
    const chave = chaveDia(new Date(visita.inicio));
    const grupo = mapa.get(chave) ?? [];
    grupo.push(visita);
    mapa.set(chave, grupo);
  }
  for (const grupo of mapa.values()) {
    grupo.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }
  return mapa;
}

// Os 42 dias da grade do mês (6 semanas), começando no domingo anterior ao dia 1.
export function diasDaGradeDoMes(refDate: Date): Date[] {
  const primeiro = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const inicio = new Date(primeiro);
  inicio.setDate(inicio.getDate() - inicio.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

// Os 7 dias da semana que contém refDate (domingo a sábado).
export function diasDaSemana(refDate: Date): Date[] {
  const inicio = new Date(refDate);
  inicio.setDate(refDate.getDate() - refDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

// Intervalo [de, ate] em ISO que cobre a visão atual — usado pra buscar as
// visitas do backend (GET /visitas?de=&ate=).
export function intervaloDaVisao(
  view: 'mes' | 'semana' | 'dia' | 'lista',
  refDate: Date,
): { de: string; ate: string } {
  let inicio: Date;
  let fim: Date;

  if (view === 'mes') {
    const dias = diasDaGradeDoMes(refDate);
    inicio = dias[0];
    fim = dias[dias.length - 1];
  } else if (view === 'semana') {
    const dias = diasDaSemana(refDate);
    inicio = dias[0];
    fim = dias[dias.length - 1];
  } else if (view === 'dia') {
    inicio = new Date(refDate);
    fim = new Date(refDate);
  } else {
    // Lista: do início do dia de hoje até 90 dias à frente.
    inicio = new Date(refDate);
    fim = new Date(refDate);
    fim.setDate(fim.getDate() + 90);
  }

  inicio.setHours(0, 0, 0, 0);
  fim.setHours(23, 59, 59, 999);
  return { de: inicio.toISOString(), ate: fim.toISOString() };
}

export const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
