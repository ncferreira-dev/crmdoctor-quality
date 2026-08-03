'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { IconeOlho, IconeOlhoFechado } from './icons';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  erro?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, erro, className = '', id, type, ...props },
  ref,
) {
  const [revelada, setRevelada] = useState(false);
  const ehSenha = type === 'password';
  // Quando revelada, o input vira "text" para mostrar os caracteres. O olho só
  // aparece em campo de senha, então nenhum outro tipo ganha o botão.
  const tipoEfetivo = ehSenha && revelada ? 'text' : type;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-light uppercase tracking-wide text-ink/60">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={tipoEfetivo}
          className={`w-full rounded-md border border-ink/15 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${
            ehSenha ? 'pr-10' : ''
          } ${erro ? 'border-accent' : ''} ${className}`}
          {...props}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setRevelada((v) => !v)}
            // tabIndex -1: o olho não entra na navegação por Tab entre os
            // campos. É auxílio visual, não etapa do preenchimento.
            tabIndex={-1}
            aria-label={revelada ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink/40 transition-colors hover:text-ink/70"
          >
            {revelada ? (
              <IconeOlhoFechado className="h-4 w-4" />
            ) : (
              <IconeOlho className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {erro && <span className="text-xs text-accent">{erro}</span>}
    </div>
  );
});
