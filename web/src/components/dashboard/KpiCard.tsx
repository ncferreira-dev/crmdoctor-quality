import Link from 'next/link';

interface KpiCardProps {
  label: string;
  valor: number | string;
  // Para onde o card leva. Todo número do dashboard é uma porta: o usuário
  // clica e vai ver QUAIS são, não só quantos.
  href: string;
  // Contexto embaixo do número (ex.: "3 concluídos este mês").
  nota?: string;
  // Vira accent (vermelho) só quando é alerta com valor > 0. Nunca pinta o
  // fundo do card — o vermelho fica no número, como manda o CLAUDE.md.
  alerta?: boolean;
}

export function KpiCard({ label, valor, href, nota, alerta = false }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-ink/10 bg-white p-4 shadow-card transition-all hover:border-brand/40 hover:shadow-raised"
    >
      <p className="text-[11px] font-light uppercase tracking-wide text-ink/55">{label}</p>
      <p
        className={`dado mt-2 text-2xl font-semibold leading-none sm:text-3xl ${
          alerta ? 'text-accent' : 'text-ink'
        }`}
      >
        {valor}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="text-[11px] text-ink/45">{nota ?? ''}</span>
        <span
          aria-hidden="true"
          className="text-ink/25 transition-colors group-hover:text-brand"
        >
          →
        </span>
      </div>
    </Link>
  );
}
