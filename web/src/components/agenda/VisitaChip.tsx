'use client';

import { Visita } from '../../types';
import { STATUS_VISITA_CHIP } from '../../lib/formato';
import { horaMinuto } from './agendaUtils';

interface VisitaChipProps {
  visita: Visita;
  onClick: (visita: Visita) => void;
  // 'compacto' = célula do mês (só hora + empresa numa linha).
  // 'detalhado' = semana/dia (hora, empresa, consultor).
  variante?: 'compacto' | 'detalhado';
}

export function VisitaChip({ visita, onClick, variante = 'compacto' }: VisitaChipProps) {
  const cor = STATUS_VISITA_CHIP[visita.status];
  const empresa = visita.empresa?.nome ?? 'Empresa';

  if (variante === 'detalhado') {
    return (
      <button
        type="button"
        onClick={() => onClick(visita)}
        className={`w-full rounded-md px-2 py-1 text-left text-xs transition-opacity hover:opacity-90 ${cor}`}
      >
        <span className="block font-black leading-tight">{horaMinuto(visita.inicio)}</span>
        <span className="block truncate">{empresa}</span>
        {visita.consultor && <span className="block truncate opacity-80">{visita.consultor.nome}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(visita)}
      className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-opacity hover:opacity-90 ${cor}`}
    >
      <span className="font-black">{horaMinuto(visita.inicio)}</span>
      <span className="truncate">{empresa}</span>
    </button>
  );
}
