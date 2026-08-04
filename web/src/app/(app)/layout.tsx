import { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { RevalidarSessao } from '../../components/layout/RevalidarSessao';

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-surface">
      <RevalidarSessao />
      <Sidebar />
      {/* pt-16 no mobile abre espaço pro botão de menu flutuante; no desktop o
          menu é coluna fixa e o conteúdo começa no topo. */}
      <main className="flex-1 overflow-y-auto p-4 pt-16 lg:p-6 lg:pt-6">{children}</main>
    </div>
  );
}
