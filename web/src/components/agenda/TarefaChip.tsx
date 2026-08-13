'use client';

import { Tarefa } from '../../types';

// A marca de tarefa na agenda, num lugar só.
//
// Existia escrita à mão dentro do MonthView, e a visão de Mês era a única que
// mostrava tarefa. Ao levar tarefa para Semana, Dia e Lista (12/08/2026),
// copiar o botão para mais três arquivos garantiria quatro versões da mesma
// marca envelhecendo em ritmos diferentes.

interface TarefaChipProps {
  tarefa: Tarefa;
  onClick: (tarefa: Tarefa) => void;
  // 'compacto' = célula do mês e coluna da semana, onde a largura é apertada.
  // 'detalhado' = dia e lista, onde cabe o responsável e o texto inteiro.
  variante?: 'compacto' | 'detalhado';
}

export function TarefaChip({ tarefa, onClick, variante = 'compacto' }: TarefaChipProps) {
  const responsavel = tarefa.responsavel?.nome;

  if (variante === 'detalhado') {
    return (
      <button
        type="button"
        onClick={() => onClick(tarefa)}
        className="flex w-full items-start gap-4 rounded-card border border-ink/10 bg-white p-3 text-left shadow-card transition-colors hover:border-brand/40"
      >
        {/* Onde a visita mostra a hora, a tarefa mostra o que ela é. Prazo de
            tarefa é data civil, sem hora: inventar um horário aqui faria
            parecer compromisso marcado. */}
        <span className="w-16 shrink-0 text-xs font-light uppercase tracking-wide text-ink/45">
          Tarefa
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black leading-none text-ink">{tarefa.titulo}</p>
          <p className="mt-1 truncate text-xs text-ink/60">
            Entrega até este dia
            {responsavel ? ` · ${responsavel}` : ''}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(tarefa)}
      title={`${tarefa.titulo}${responsavel ? ` · ${responsavel}` : ''}`}
      // 36px de alvo no celular, como o chip de visita: eram 17px, e este é um
      // botão que só existe no toque.
      className="flex min-h-9 w-full items-center truncate rounded-sm border-l-2 border-ink/30 bg-surface px-1 py-0.5 text-left text-[10px] leading-tight text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:bg-ink/10 sm:min-h-0"
    >
      {tarefa.titulo}
    </button>
  );
}
