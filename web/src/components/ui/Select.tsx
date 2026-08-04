'use client';

import { SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  // Texto de apoio abaixo do campo: explica a regra antes de a pessoa errar,
  // em vez de deixá-la descobrir pelo erro. Sai da tela quando há `erro`.
  ajuda?: string;
  erro?: string;
  // 'compacto' é para seletor dentro de linha de lista (status de tarefa, de
  // ticket, de etapa), onde o tamanho de formulário empurraria a linha inteira.
  // Existe para esses casos continuarem no design system em vez de virarem
  // <select> cru com estilo montado à mão, que era o que acontecia.
  tamanho?: 'normal' | 'compacto';
}

const TAMANHO = {
  normal: 'px-3 py-2 text-sm',
  compacto: 'px-2 py-1 text-xs',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, ajuda, erro, tamanho = 'normal', className = '', id, children, ...props },
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
        className={`rounded-md border bg-white text-ink focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink/40 ${TAMANHO[tamanho]} ${
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
