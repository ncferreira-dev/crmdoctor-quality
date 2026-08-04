'use client';

import Link from 'next/link';
import { StatusTarefa, Tarefa } from '../../types';
import { STATUS_TAREFA_LABEL } from '../../lib/formato';
import { SeloPrazo } from '../projetos/SeloPrazo';

interface ItemTarefaProps {
  tarefa: Tarefa;
  // Quem só tem TAREFAS_READ enxerga a tarefa e não mexe nela.
  podeMexer: boolean;
  // Na visão da equipe, o nome de quem responde importa; na minha, não.
  mostrarResponsavel: boolean;
  onMudarStatus: (tarefa: Tarefa, status: StatusTarefa) => void;
}

export function ItemTarefa({
  tarefa,
  podeMexer,
  mostrarResponsavel,
  onMudarStatus,
}: ItemTarefaProps) {
  const concluida = tarefa.status === 'CONCLUIDA';

  return (
    <li className="flex items-start gap-3 py-3">
      {/* Concluir é a ação principal da tela, então é um alvo direto e não uma
          opção escondida dentro de um seletor. Desmarcar reabre: quem clicou
          errado precisa de volta. */}
      <label
        className={`mt-0.5 flex shrink-0 items-center ${podeMexer ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <input
          type="checkbox"
          checked={concluida}
          disabled={!podeMexer}
          onChange={() => onMudarStatus(tarefa, concluida ? 'PENDENTE' : 'CONCLUIDA')}
          className="h-4 w-4 shrink-0 cursor-pointer rounded border-ink/25 text-brand accent-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default"
        />
        <span className="sr-only">
          {concluida ? `Reabrir tarefa ${tarefa.titulo}` : `Concluir tarefa ${tarefa.titulo}`}
        </span>
      </label>

      <div className="min-w-0 flex-1">
        {/* Título e selos na mesma linha quando cabem, empilhados quando não:
            numa tela de celular, disputar a linha fazia o título quebrar em
            três pedaços de duas palavras. */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <p
            className={`text-sm leading-snug ${concluida ? 'text-ink/35 line-through' : 'text-ink'}`}
          >
            {tarefa.titulo}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {/* Prazo só enquanto a tarefa está aberta: em tarefa concluída o
                selo de atraso é ruído, o prazo já não cobra nada de ninguém. */}
            {!concluida && tarefa.prazo && <SeloPrazo prazo={tarefa.prazo} tipo="tarefa" />}

            {/* "Em andamento" existe no modelo e é o que diferencia "vou fazer"
                de "estou fazendo".
                O desenho é de propósito diferente do SeloPrazo ao lado: prazo é
                etiqueta (fundo cheio, sem borda, não clicável) e status é
                controle (borda, fundo branco, clicável). Os dois como pílula
                igual faziam a pessoa tentar clicar no prazo e não descobrir que
                o status muda. */}
            {!concluida && podeMexer && (
              <button
                type="button"
                onClick={() =>
                  onMudarStatus(
                    tarefa,
                    tarefa.status === 'EM_ANDAMENTO' ? 'PENDENTE' : 'EM_ANDAMENTO',
                  )
                }
                aria-label={`Status da tarefa ${tarefa.titulo}: ${STATUS_TAREFA_LABEL[tarefa.status]}. Clique para alternar.`}
                className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                  tarefa.status === 'EM_ANDAMENTO'
                    ? 'border-brand/30 bg-white text-brand'
                    : 'border-ink/15 bg-white text-ink/55 hover:border-ink/30 hover:text-ink'
                }`}
              >
                {STATUS_TAREFA_LABEL[tarefa.status]}
              </button>
            )}
            {!concluida && !podeMexer && (
              <span className="text-[11px] text-ink/45">{STATUS_TAREFA_LABEL[tarefa.status]}</span>
            )}
          </div>
        </div>

        {(tarefa.descricao || tarefa.projeto || mostrarResponsavel) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink/45">
            {mostrarResponsavel && tarefa.responsavel && <span>{tarefa.responsavel.nome}</span>}
            {tarefa.projeto && (
              <Link
                href={`/projetos/${tarefa.projeto.id}`}
                className="text-brand underline-offset-2 hover:underline"
              >
                {tarefa.projeto.titulo}
              </Link>
            )}
            {tarefa.descricao && <span className="truncate">{tarefa.descricao}</span>}
          </p>
        )}
      </div>
    </li>
  );
}
