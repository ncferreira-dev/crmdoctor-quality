'use client';

import { ButtonHTMLAttributes } from 'react';

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

const VARIANTE_CLASSES: Record<Variante, string> = {
  // Primário é vinho (brand), nunca vermelho — CLAUDE.md. Vermelho (accent)
  // fica só na variante danger.
  primary: 'bg-brand text-white hover:bg-brand/90',
  secondary: 'bg-surface text-ink hover:bg-ink/10',
  ghost: 'bg-transparent text-ink/60 hover:bg-surface',
  danger: 'bg-accent text-white hover:bg-accent/90',
};

export function Button({ variante = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTE_CLASSES[variante]} ${className}`}
      {...props}
    />
  );
}
