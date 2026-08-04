'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Cabecalho } from './Cabecalho';
import { RevalidarSessao } from './RevalidarSessao';

// A moldura de todas as telas logadas. É client porque guarda o estado da
// gaveta do celular, que o botão do cabeçalho abre e a própria gaveta fecha.
// O layout do grupo (app) fica server e só monta isto em volta da página.
export function Shell({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex h-screen bg-surface">
      <RevalidarSessao />
      <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} />

      {/* min-w-0 para o conteúdo poder encolher: sem isso, uma tabela larga
          empurra a coluna inteira e a página ganha rolagem horizontal. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Cabecalho onAbrirMenu={() => setMenuAberto(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
