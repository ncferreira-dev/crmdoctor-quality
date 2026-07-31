'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className = '', id, children, ...props },
  ref,
) {
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
        className={`rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
