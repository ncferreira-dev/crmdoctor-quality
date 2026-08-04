'use client';

import { Visita } from '../../types';
import { chaveDia, diasDaSemana, DIAS_SEMANA_CURTO } from './agendaUtils';
import { VisitaChip } from './VisitaChip';

interface WeekViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  onSelecionarVisita: (visita: Visita) => void;
  onSelecionarDia: (dia: Date) => void;
}

// Semana como 7 colunas (dias), cada uma listando as visitas daquele dia por
// horário — mostra "a operação de cada dia da semana" sem uma grade de 24h.
export function WeekView({ refDate, visitasPorDia, onSelecionarVisita, onSelecionarDia }: WeekViewProps) {
  const dias = diasDaSemana(refDate);
  const hoje = chaveDia(new Date());

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {dias.map((dia) => {
        const chave = chaveDia(dia);
        const ehHoje = chave === hoje;
        const visitas = visitasPorDia.get(chave) ?? [];

        return (
          <div key={chave} className="flex min-h-40 flex-col rounded-card border border-ink/10 bg-white p-2 shadow-card">
            <button
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className="mb-2 text-left"
            >
              <span className="block text-xs font-light uppercase tracking-wide text-ink/60">
                {DIAS_SEMANA_CURTO[dia.getDay()]}
              </span>
              <span className={`text-lg font-black leading-none ${ehHoje ? 'text-brand' : 'text-ink'}`}>
                {dia.getDate()}
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-1">
              {visitas.length === 0 ? (
                // Dia livre é informação, e o traço não dizia isso. Clicar no
                // número do dia acima abre o formulário já naquela data.
                <span className="text-[11px] text-ink/30">Livre</span>
              ) : (
                visitas.map((v) => (
                  <VisitaChip key={v.id} visita={v} variante="detalhado" onClick={onSelecionarVisita} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
