'use client';

import { Visita } from '../../types';
import { STATUS_VISITA_LABEL } from '../../lib/formato';
import { chaveDia, horaMinuto } from './agendaUtils';
import { Badge } from '../ui/Badge';

interface DayViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  onSelecionarVisita: (visita: Visita) => void;
}

export function DayView({ refDate, visitasPorDia, onSelecionarVisita }: DayViewProps) {
  const visitas = visitasPorDia.get(chaveDia(refDate)) ?? [];

  if (visitas.length === 0) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-ink/40">Nenhuma visita neste dia.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visitas.map((visita) => (
        <button
          key={visita.id}
          type="button"
          onClick={() => onSelecionarVisita(visita)}
          className="flex items-start gap-4 rounded-card border border-ink/10 bg-white p-4 text-left shadow-card transition-colors hover:border-brand/40"
        >
          <div className="w-24 shrink-0">
            <span className="block font-black leading-none text-ink">{horaMinuto(visita.inicio)}</span>
            <span className="block text-xs text-ink/50">até {horaMinuto(visita.fim)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black leading-none text-ink">{visita.empresa?.nome ?? 'Empresa'}</p>
            <p className="mt-1 text-xs text-ink/60">
              {visita.tipoServico}
              {visita.consultor ? ` · ${visita.consultor.nome}` : ''}
            </p>
          </div>
          <Badge tom={visita.status === 'CANCELADA' ? 'alerta' : 'neutral'}>
            {STATUS_VISITA_LABEL[visita.status]}
          </Badge>
        </button>
      ))}
    </div>
  );
}
