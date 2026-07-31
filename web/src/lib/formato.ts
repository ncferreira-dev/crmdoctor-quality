import { Segmento, StatusTicket, StatusVisita } from '../types';

export const STATUS_VISITA_LABEL: Record<StatusVisita, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

// Paleta monocromática + accent (CLAUDE.md): os 4 status são diferenciados por
// tom de brand/ink, não por cores diversas. Chip usado no calendário.
export const STATUS_VISITA_CHIP: Record<StatusVisita, string> = {
  AGENDADA: 'bg-brand/70 text-white',
  CONFIRMADA: 'bg-brand text-white',
  REALIZADA: 'bg-ink/30 text-ink',
  CANCELADA: 'bg-surface text-ink/40 line-through',
};

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  FARMA: 'Farma',
  COSMETICOS: 'Cosméticos',
  HOSPITALAR: 'Hospitalar',
  LOGISTICA: 'Logística',
  LABORATORIO: 'Laboratório',
  OUTRO: 'Outro',
};

export const STATUS_TICKET_LABEL: Record<StatusTicket, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  RESOLVIDO: 'Resolvido',
};

export const PRIORIDADE_LABEL: Record<number, string> = {
  1: 'Alta',
  2: 'Média',
  3: 'Baixa',
};

const FUSO = 'America/Sao_Paulo';

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO });
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
