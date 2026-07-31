import { EstagioProjeto, Segmento, StatusEtapa, StatusTicket, StatusVisita } from '../types';

export const ESTAGIO_PROJETO_LABEL: Record<EstagioProjeto, string> = {
  DIAGNOSTICO: 'Diagnóstico',
  PROPOSTA: 'Proposta',
  EXECUCAO: 'Execução',
  CONCLUIDO: 'Concluído',
};

// Ordem do funil de entrega (o enum vem alfabético do backend, que não é a
// ordem do processo).
export const ESTAGIOS_PROJETO: EstagioProjeto[] = [
  'DIAGNOSTICO',
  'PROPOSTA',
  'EXECUCAO',
  'CONCLUIDO',
];

export const STATUS_ETAPA_LABEL: Record<StatusEtapa, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

export type UrgenciaPrazo = 'vencido' | 'critico' | 'proximo' | 'tranquilo' | 'sem-prazo';

// A régua de urgência do compliance. O cron alerta a 15 dias, então a UI usa a
// MESMA janela: o que o sistema considera "avisar" é o que a tela pinta de
// alerta. Divergir aqui faria a tela contradizer a notificação.
export function urgenciaDoPrazo(prazoIso: string | null): UrgenciaPrazo {
  if (!prazoIso) return 'sem-prazo';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(prazoIso);
  const dias = Math.round((prazo.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));

  if (dias < 0) return 'vencido';
  if (dias <= 7) return 'critico';
  if (dias <= 15) return 'proximo';
  return 'tranquilo';
}

export function diasAteOPrazo(prazoIso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(prazoIso).getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
}

// Texto humano do prazo, já com o sinal de urgência embutido.
export function textoPrazo(prazoIso: string | null): string {
  if (!prazoIso) return 'Sem prazo definido';
  const dias = diasAteOPrazo(prazoIso);
  if (dias < 0) return `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

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
