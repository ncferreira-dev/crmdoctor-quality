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
        {/* O projeto é o motivo da visita existir. Aparece na visão de semana e
            dia, onde há espaço, e não no chip compacto do mês. */}
        {visita.projeto && (
          <span className="mt-0.5 block truncate opacity-70">{visita.projeto.titulo}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(visita)}
      // min-h-9 (36px) só no celular: no mês o chip tinha 19px de altura, que
      // é metade do alvo de toque que este projeto adotou, e é o bloco mais
      // clicado da tela em campo. No desktop o mouse acerta 19px sem drama e a
      // célula do mês é apertada, então a altura mínima cai a partir de sm.
      className={`flex min-h-9 w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-opacity hover:opacity-90 sm:min-h-0 ${cor}`}
    >
      <span className="font-black">{horaMinuto(visita.inicio)}</span>
      <span className="truncate">{empresa}</span>
    </button>
  );
}
