'use client';

import { Lead } from '../../types';

const SEGMENTO_LABEL: Record<string, string> = {
  FARMA: 'Farma',
  COSMETICOS: 'Cosméticos',
  HOSPITALAR: 'Hospitalar',
  LOGISTICA: 'Logística',
  LABORATORIO: 'Laboratório',
  OUTRO: 'Outro',
};

interface KanbanCardProps {
  lead: Lead;
  arrastavel: boolean;
  emMovimento: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export function KanbanCard({ lead, arrastavel, emMovimento, onDragStart, onDragEnd }: KanbanCardProps) {
  return (
    <div
      draggable={arrastavel}
      onDragStart={(evento) => {
        evento.dataTransfer.effectAllowed = 'move';
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
      className={`rounded-card border border-ink/10 bg-white p-3 shadow-card transition-opacity ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${emMovimento ? 'opacity-40' : 'opacity-100'}`}
    >
      <p className="font-black leading-none text-ink">{lead.nome}</p>
      {lead.empresaNome ? <p className="mt-1.5 text-xs text-ink/60">{lead.empresaNome}</p> : null}
      {lead.segmento ? (
        <span className="mt-2 inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[11px] uppercase tracking-wide font-light text-ink/70">
          {SEGMENTO_LABEL[lead.segmento] ?? lead.segmento}
        </span>
      ) : null}
    </div>
  );
}
