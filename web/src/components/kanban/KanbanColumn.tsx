'use client';

import { EstagioLead, Lead } from '../../types';
import { KanbanCard } from './KanbanCard';
import { Plus } from '../ui/icons';

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
  onSelecionarLead: (lead: Lead) => void;
  onNovoNaColuna: (estagio: EstagioLead) => void;
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
  onSelecionarLead,
  onNovoNaColuna,
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
      className={`flex w-72 shrink-0 flex-col rounded-card bg-white/60 p-3 transition-colors ${
        sobreColuna ? 'ring-2 ring-brand' : 'ring-1 ring-ink/5'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-light uppercase tracking-wide text-ink/60">{titulo}</span>
          <span className="dado text-xs text-ink/40">{leads.length}</span>
        </div>
        {podeEditar && (
          <button
            type="button"
            onClick={() => onNovoNaColuna(estagio)}
            aria-label={`Novo lead em ${titulo}`}
            className="rounded p-1 text-ink/40 transition-colors hover:bg-surface hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {leads.length === 0 ? (
          <p className="px-1 py-2 text-xs text-ink/30">Sem leads neste estágio</p>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              arrastavel={podeEditar}
              emMovimento={idEmMovimento === lead.id}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              onSelecionar={onSelecionarLead}
            />
          ))
        )}
      </div>
    </div>
  );
}
