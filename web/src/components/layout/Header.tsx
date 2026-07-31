'use client';

import { useRouter } from 'next/navigation';
import { limparSessao } from '../../lib/auth';
import { useNomeUsuario } from '../../hooks/useSessao';
import { Button } from '../ui/Button';

export function Header() {
  const router = useRouter();
  const nome = useNomeUsuario();

  function sair() {
    limparSessao();
    router.push('/login');
  }

  return (
    // pl-16 no mobile abre espaço pro botão de menu flutuante da sidebar.
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink/10 bg-white pl-16 pr-4 lg:px-6">
      <div />
      <div className="flex items-center gap-3">
        {/* Sino de notificações entra no Prompt 16 (NotificationBell) */}
        <span className="text-sm text-ink/70">{nome}</span>
        <Button variante="ghost" onClick={sair}>
          Sair
        </Button>
      </div>
    </header>
  );
}
