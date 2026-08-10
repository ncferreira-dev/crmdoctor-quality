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
      //
      // SÓ transform, nunca opacity. A entrada animava `opacity: 0 -> 1` e o
      // card em movimento ficava em `opacity: 0.4` pela animação: as duas
      // coisas faziam a animação decidir se o card é visível, que é a regra que
      // globals.css proíbe desde que esta base perdeu tela duas vezes por isso.
      // Animação não roda com a aba em segundo plano, e um card parado em
      // opacity 0 é um lead que sumiu do funil.
      initial={{ y: 4 }}
      animate={{ y: 0 }}
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
      // O card arrastado continua mais apagado, mas por classe estática e não
      // por animação: se o JS de animação parar, ele fica opaco, que é o estado
      // seguro. Antes esse 0.4 vinha do `animate`, e um card que ficasse preso
      // nele seria um lead meio invisível no funil.
      className={`rounded-card border border-ink/10 bg-white p-3 shadow-card transition-shadow hover:shadow-raised ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${emMovimento ? 'opacity-40' : ''}`}
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
