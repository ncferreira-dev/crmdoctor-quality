'use client';

import * as motion from 'motion/react-client';
import { Lead } from '../../types';
import { SEGMENTO_LABEL } from '../../lib/formato';

interface KanbanCardProps {
  lead: Lead;
  arrastavel: boolean;
  emMovimento: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onSelecionar: (lead: Lead) => void;
}

export function KanbanCard({
  lead,
  arrastavel,
  emMovimento,
  onDragStart,
  onDragEnd,
  onSelecionar,
}: KanbanCardProps) {
  return (
    <motion.div
      // Entrada curta (140ms): dá continuidade quando o card muda de coluna,
      // sem virar espera. Em app de uso diário, animação longa é fricção.
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: emMovimento ? 0.4 : 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      draggable={arrastavel}
      onDragStart={() => onDragStart(lead.id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelecionar(lead)}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          onSelecionar(lead);
        }
      }}
      role="button"
      tabIndex={0}
      className={`rounded-card border border-ink/10 bg-white p-3 shadow-card transition-shadow hover:shadow-raised ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
    >
      <p className="font-semibold leading-tight text-ink">{lead.nome}</p>
      {lead.empresaNome ? (
        <p className="mt-1 truncate text-xs text-ink/60">{lead.empresaNome}</p>
      ) : null}
      {lead.segmento ? (
        <span className="mt-2 inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-light uppercase tracking-wide text-ink/60">
          {SEGMENTO_LABEL[lead.segmento]}
        </span>
      ) : null}
    </motion.div>
  );
}
