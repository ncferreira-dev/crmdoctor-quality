import { Segmento, StatusTicket } from '../types';

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
