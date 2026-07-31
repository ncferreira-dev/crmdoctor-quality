'use client';

import { Visita } from '../../types';
import { STATUS_VISITA_LABEL, formatarData } from '../../lib/formato';
import { chaveDia, horaMinuto } from './agendaUtils';
import { Badge } from '../ui/Badge';

interface ListViewProps {
  visitas: Visita[];
  onSelecionarVisita: (visita: Visita) => void;
}

export function ListView({ visitas, onSelecionarVisita }: ListViewProps) {
  if (visitas.length === 0) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-ink/40">Nenhuma visita no período.</p>
      </div>
    );
  }

  // Agrupa por dia, preservando a ordem cronológica (as visitas já chegam
  // ordenadas por início do backend).
  const grupos = new Map<string, Visita[]>();
  for (const visita of visitas) {
    const chave = chaveDia(new Date(visita.inicio));
    const grupo = grupos.get(chave) ?? [];
    grupo.push(visita);
    grupos.set(chave, grupo);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(grupos.entries()).map(([chave, doDia]) => (
        <div key={chave}>
          <h3 className="mb-2 text-xs font-light uppercase tracking-wide text-ink/60">
            {formatarData(doDia[0].inicio)}
          </h3>
          <div className="flex flex-col gap-2">
            {doDia.map((visita) => (
              <button
                key={visita.id}
                type="button"
                onClick={() => onSelecionarVisita(visita)}
                className="flex items-center gap-4 rounded-card border border-ink/10 bg-white p-3 text-left shadow-card transition-colors hover:border-brand/40"
              >
                <span className="w-16 shrink-0 font-black leading-none text-ink">{horaMinuto(visita.inicio)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black leading-none text-ink">{visita.empresa?.nome ?? 'Empresa'}</p>
                  <p className="mt-1 truncate text-xs text-ink/60">
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
        </div>
      ))}
    </div>
  );
}
