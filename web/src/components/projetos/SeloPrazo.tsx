import { UrgenciaPrazo, textoPrazo, urgenciaDoPrazo } from '../../lib/formato';

// O prazo é a informação mais importante de um CRM de compliance, então ele tem
// tratamento próprio em vez de virar mais um texto cinza. A escala de urgência
// usa a paleta da marca: accent só onde há risco real (vencido/crítico),
// brand no que está próximo, neutro no resto — assim o vermelho não perde peso.
const ESTILO: Record<UrgenciaPrazo, string> = {
  vencido: 'bg-accent text-white',
  critico: 'bg-accent/10 text-accent',
  proximo: 'bg-brand/10 text-brand',
  tranquilo: 'bg-surface text-ink/60',
  'sem-prazo': 'bg-surface text-ink/35',
};

export function SeloPrazo({ prazo }: { prazo: string | null }) {
  const urgencia = urgenciaDoPrazo(prazo);

  return (
    <span
      className={`dado inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] ${ESTILO[urgencia]}`}
    >
      {textoPrazo(prazo)}
    </span>
  );
}
