import { EstagioProjeto } from '../../types';
import { ESTAGIOS_PROJETO, ESTAGIO_PROJETO_LABEL } from '../../lib/formato';

interface ProjetosPorEstagioProps {
  dados: { estagio: EstagioProjeto; total: number }[];
}

export function ProjetosPorEstagio({ dados }: ProjetosPorEstagioProps) {
  const porEstagio = new Map(dados.map((d) => [d.estagio, d.total]));
  const maximo = Math.max(1, ...dados.map((d) => d.total));

  return (
    <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
      <p className="text-xs font-light uppercase tracking-wide text-ink/60">Projetos por estágio</p>
      <div className="mt-4 flex flex-col gap-3">
        {ESTAGIOS_PROJETO.map((estagio) => {
          const total = porEstagio.get(estagio) ?? 0;
          return (
            <div key={estagio}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-light uppercase tracking-wide text-ink/60">
                  {ESTAGIO_PROJETO_LABEL[estagio]}
                </span>
                <span className="font-black leading-none text-ink">{total}</span>
              </div>
              {/* Barra à mão (div com width proporcional), sem lib de chart. */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(total / maximo) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
