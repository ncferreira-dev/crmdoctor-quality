'use client';

import { ReactNode } from 'react';

type Cor = 'slate' | 'green' | 'red' | 'amber' | 'blue';

const COR_CLASSES: Record<Cor, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
};

export function Badge({ cor = 'slate', children }: { cor?: Cor; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COR_CLASSES[cor]}`}>
      {children}
    </span>
  );
}
