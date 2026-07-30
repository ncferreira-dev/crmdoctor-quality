'use client';

import { EstagioLead, Lead } from '../../types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  estagio: EstagioLead;
  titulo: string;
  leads: Lead[];
  podeEditar: boolean;
  idEmMovimento: string | null;
  sobreColuna: boolean;
  onDragStartCard: (id: string) => void;
  onDragEndCard: () => void;
  onDragOverColuna: (estagio: EstagioLead) => void;
  onDragLeaveColuna: () => void;
  onDropColuna: (estagio: EstagioLead) => void;
}

export function KanbanColumn({
  estagio,
  titulo,
  leads,
  podeEditar,
  idEmMovimento,
  sobreColuna,
  onDragStartCard,
  onDragEndCard,
  onDragOverColuna,
  onDragLeaveColuna,
  onDropColuna,
}: KanbanColumnProps) {
  return (
    <div
      onDragOver={(evento) => {
        if (!podeEditar) return;
        evento.preventDefault();
        onDragOverColuna(estagio);
      }}
      onDragLeave={onDragLeaveColuna}
      onDrop={(evento) => {
        evento.preventDefault();
        onDropColuna(estagio);
      }}
      className={`flex w-72 shrink-0 flex-col rounded-card bg-surface p-3 transition-colors ${
        sobreColuna ? 'ring-2 ring-brand' : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs font-light uppercase tracking-wide text-ink/60">{titulo}</span>
        <span className="font-black leading-none text-ink">{leads.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {leads.length === 0 ? (
          <p className="px-1 text-xs text-ink/40">Sem leads neste estágio</p>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              arrastavel={podeEditar}
              emMovimento={idEmMovimento === lead.id}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
            />
          ))
        )}
      </div>
    </div>
  );
}
