'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, limparSessao } from '../../lib/auth';
import { Button } from '../ui/Button';

export function Header() {
  const router = useRouter();
  const [nome, setNome] = useState('');

  useEffect(() => {
    setNome(getUser()?.nome ?? '');
  }, []);

  function sair() {
    limparSessao();
    router.push('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {/* Sino de notificações entra no Prompt 16 (NotificationBell) */}
        <span className="text-sm text-slate-600">{nome}</span>
        <Button variante="ghost" onClick={sair}>
          Sair
        </Button>
      </div>
    </header>
  );
}
