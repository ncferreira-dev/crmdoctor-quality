'use client';

import Link from 'next/link';
import { Notificacao } from '../../types';
import { textoPrazoDoAlerta } from '../../lib/formato';

interface PainelAlertasProps {
  alertas: Notificacao[] | null;
  onMarcarLida: (id: string) => void;
  marcando: string | null;
}

// O cron de compliance gera estes alertas todo dia às 08:00. Até aqui eles
// existiam só como um número no card "Alertas não lidos", que levava para
// /projetos, onde não há alerta nenhum: o número nunca zerava porque não havia
// lugar no sistema onde ler ou dar baixa. Este painel é esse lugar.
export function PainelAlertas({ alertas, onMarcarLida, marcando }: PainelAlertasProps) {
  return (
    <section
      id="alertas"
      className="rounded-card border border-ink/10 bg-white p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-light uppercase tracking-wide text-ink/50">
          Alertas de compliance
        </h2>
        {alertas && alertas.length > 0 && (
          <span className="dado text-xs text-ink/45">
            {alertas.length} em aberto
          </span>
        )}
      </div>

      {!alertas ? (
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      ) : alertas.length === 0 ? (
        <p className="mt-3 text-sm text-ink/45">
          Nenhum prazo de compliance esperando você. O sistema verifica todo dia às 08:00 e avisa
          aqui o que é seu.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-ink/10">
          {alertas.map((alerta) => (
            <li key={alerta.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-ink">{alerta.mensagem}</p>
                <p className="mt-0.5 text-[11px] text-ink/45">
                  {alerta.tipo === 'COMPLIANCE_ETAPA' ? 'Marco do projeto' : 'Prazo do projeto'}
                  {' · '}
                  {textoPrazoDoAlerta(alerta.dataReferencia)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {alerta.projetoId && (
                  <Link
                    href="/projetos"
                    className="text-xs font-medium text-brand underline-offset-2 hover:underline"
                  >
                    Ver projeto
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => onMarcarLida(alerta.id)}
                  disabled={marcando === alerta.id}
                  className="min-h-9 shrink-0 rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/70 transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
                >
                  {marcando === alerta.id ? 'Marcando...' : 'Marcar como lida'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
