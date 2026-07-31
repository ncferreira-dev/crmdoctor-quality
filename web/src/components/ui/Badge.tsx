'use client';

import { ReactNode } from 'react';

// A paleta da marca é monocromática + accent (CLAUDE.md), então em vez de
// verde/azul/amarelo os badges têm só três tons: neutro (padrão), destaque
// (brand) e alerta (accent, vermelho — reservado a atraso/erro).
type Tom = 'neutral' | 'destaque' | 'alerta';

const TOM_CLASSES: Record<Tom, string> = {
  neutral: 'bg-surface text-ink/70',
  destaque: 'bg-brand/10 text-brand',
  alerta: 'bg-accent/10 text-accent',
};

export function Badge({ tom = 'neutral', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-light uppercase tracking-wide ${TOM_CLASSES[tom]}`}
    >
      {children}
    </span>
  );
}
