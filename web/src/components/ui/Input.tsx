'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  erro?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, erro, className = '', id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-light uppercase tracking-wide text-ink/60">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`rounded-md border border-ink/15 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${
          erro ? 'border-accent' : ''
        } ${className}`}
        {...props}
      />
      {erro && <span className="text-xs text-accent">{erro}</span>}
    </div>
  );
});
