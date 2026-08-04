'use client';

import { SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  // Texto de apoio abaixo do campo: explica a regra antes de a pessoa errar,
  // em vez de deixá-la descobrir pelo erro. Sai da tela quando há `erro`.
  ajuda?: string;
  erro?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, ajuda, erro, className = '', id, children, ...props },
  ref,
) {
  const idInterno = useId();
  const idAuxiliar = `${id ?? idInterno}-auxiliar`;
  const mensagem = erro ?? ajuda;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-light uppercase tracking-wide text-ink/60">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={mensagem ? idAuxiliar : undefined}
        className={`rounded-md border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink/40 ${
          erro
            ? 'border-accent focus:border-accent focus:ring-accent'
            : 'border-ink/15 focus:border-brand focus:ring-brand'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {mensagem && (
        <p
          id={idAuxiliar}
          role={erro ? 'alert' : undefined}
          className={`text-[11px] leading-relaxed ${erro ? 'text-accent' : 'text-ink/45'}`}
        >
          {mensagem}
        </p>
      )}
    </div>
  );
});
