import Link from 'next/link';

export interface ItemRanking {
  id: string;
  rotulo: string;
  valor: number;
  // Texto à direita (ex.: "R$ 45.000"). Opcional.
  detalhe?: string;
  href?: string;
}

interface BarraRankingProps {
  titulo: string;
  itens: ItemRanking[];
  vazio: string;
  // Sufixo do valor no rótulo (ex.: "projetos", "marcos").
  unidade?: string;
}

// Ranking em barras feitas à mão (div com largura proporcional). Comparação
// categórica não justifica uma lib de chart — barra é largura percentual.
export function BarraRanking({ titulo, itens, vazio, unidade }: BarraRankingProps) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor));

  return (
    <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
      <p className="text-[11px] font-light uppercase tracking-wide text-ink/55">{titulo}</p>

      {itens.length === 0 ? (
        <p className="mt-4 text-xs text-ink/35">{vazio}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {itens.map((item) => {
            const conteudo = (
              <>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm text-ink/80">{item.rotulo}</span>
                  <span className="dado shrink-0 text-xs text-ink/55">
                    {item.detalhe ?? `${item.valor}${unidade ? ` ${unidade}` : ''}`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-500"
                    style={{ width: `${(item.valor / maximo) * 100}%` }}
                  />
                </div>
              </>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="group block">
                <div className="transition-opacity group-hover:opacity-70">{conteudo}</div>
              </Link>
            ) : (
              <div key={item.id}>{conteudo}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
