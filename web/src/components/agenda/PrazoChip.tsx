'use client';

import Link from 'next/link';
import { Projeto } from '../../types';

// A marca de prazo de compliance na agenda, num lugar só. Mesmo motivo do
// TarefaChip: era markup solto dentro do MonthView, e Semana, Dia e Lista
// passaram a mostrar prazo em 12/08/2026.
//
// O desenho é deliberadamente diferente do bloco de visita: sem hora, sem
// preenchimento cheio, só uma faixa com barra à esquerda. Visita é compromisso
// de alguém; prazo é uma data que chega sozinha, e confundir os dois numa
// agenda de compliance faria a pessoa achar que tem visita marcada onde não
// tem. É link, e não botão, porque prazo se resolve dentro do projeto.

interface PrazoChipProps {
  projeto: Projeto;
  variante?: 'compacto' | 'detalhado';
}

export function PrazoChip({ projeto, variante = 'compacto' }: PrazoChipProps) {
  if (variante === 'detalhado') {
    return (
      <Link
        href={`/projetos/${projeto.id}`}
        className="flex w-full items-start gap-4 rounded-card border border-accent/25 bg-accent/[0.03] p-3 text-left shadow-card transition-colors hover:border-accent/60"
      >
        <span className="w-16 shrink-0 text-xs font-light uppercase tracking-wide text-accent">
          Prazo
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black leading-none text-ink">{projeto.titulo}</p>
          <p className="mt-1 truncate text-xs text-ink/60">
            Prazo de compliance
            {projeto.empresa ? ` · ${projeto.empresa.nome}` : ''}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/projetos/${projeto.id}`}
      title={`Prazo de compliance: ${projeto.titulo}`}
      className="flex min-h-9 items-center gap-1 truncate border-l-2 border-accent bg-accent/5 py-0.5 pl-1 pr-1 text-[10px] text-accent transition-colors hover:bg-accent/10 sm:min-h-0"
    >
      <span className="font-black uppercase tracking-wide">Prazo</span>
      <span className="truncate">{projeto.titulo}</span>
    </Link>
  );
}
