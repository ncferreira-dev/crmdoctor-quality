'use client';

import Link from 'next/link';
import { Tarefa } from '../../types';
import { STATUS_TAREFA_LABEL, formatarDataCivil } from '../../lib/formato';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { SeloPrazo } from '../projetos/SeloPrazo';

// Leitura da tarefa a partir da agenda.
//
// Na grade do mês a marca de tarefa cabe em uma linha e o título quase nunca
// cabe inteiro: a pessoa via "Revisar procedimento d..." e não tinha como saber
// o que era sem sair da agenda. O prazo de projeto já abria o projeto; a marca
// de tarefa não abria nada.
//
// É só leitura de propósito. Mudar status, prazo ou responsável é da tela de
// tarefas, e duplicar isso aqui seria duas telas para manter em vez de uma.
interface TarefaDetalheModalProps {
  tarefa: Tarefa | null;
  onFechar: () => void;
}

export function TarefaDetalheModal({ tarefa, onFechar }: TarefaDetalheModalProps) {
  return (
    <Modal aberto={Boolean(tarefa)} titulo="Tarefa" onFechar={onFechar}>
      {tarefa && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold leading-snug text-ink">{tarefa.titulo}</p>
            {tarefa.descricao && (
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink/60">
                {tarefa.descricao}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{STATUS_TAREFA_LABEL[tarefa.status]}</Badge>
            {tarefa.status !== 'CONCLUIDA' && tarefa.prazo && (
              <SeloPrazo prazo={tarefa.prazo} tipo="tarefa" />
            )}
          </div>

          <dl className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/50">Responsável</dt>
              <dd className="text-right text-ink">
                {tarefa.responsavel?.nome ?? 'Sem responsável'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/50">Prazo</dt>
              <dd className="dado text-right text-ink">
                {tarefa.prazo ? formatarDataCivil(tarefa.prazo) : 'Sem prazo'}
              </dd>
            </div>
            {tarefa.projeto && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink/50">Projeto</dt>
                <dd className="text-right">
                  <Link
                    href={`/projetos/${tarefa.projeto.id}`}
                    className="text-brand underline-offset-2 hover:underline"
                  >
                    {tarefa.projeto.titulo}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          <Link
            href="/tarefas"
            className="text-xs text-brand underline-offset-2 hover:underline"
          >
            Abrir em Minhas tarefas
          </Link>
        </div>
      )}
    </Modal>
  );
}
