interface KpiCardProps {
  label: string;
  valor: number | string;
  // Vira accent (vermelho) só quando é um alerta com valor > 0. Nunca pinta
  // o fundo do card — o vermelho é só no número, como manda o CLAUDE.md.
  alerta?: boolean;
}

export function KpiCard({ label, valor, alerta = false }: KpiCardProps) {
  return (
    <div className="rounded-card border border-ink/10 bg-white p-4 shadow-card">
      <p className="text-xs font-light uppercase tracking-wide text-ink/60">{label}</p>
      <p className={`dado mt-2 text-3xl font-semibold leading-none ${alerta ? 'text-accent' : 'text-ink'}`}>
        {valor}
      </p>
    </div>
  );
}
