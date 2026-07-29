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
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 ${
          erro ? 'border-red-400' : ''
        } ${className}`}
        {...props}
      />
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
});
