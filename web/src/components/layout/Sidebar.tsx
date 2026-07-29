'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { temPermissao } from '../../lib/auth';

const LINKS_BASE = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/projetos', label: 'Projetos' },
  { href: '/tickets', label: 'Tickets' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/consultores', label: 'Consultores' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mostrarCargos, setMostrarCargos] = useState(false);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);

  useEffect(() => {
    setMostrarCargos(temPermissao('CARGOS_MANAGE'));
    setMostrarUsuarios(temPermissao('USUARIOS_MANAGE'));
  }, []);

  const links = [
    ...LINKS_BASE,
    ...(mostrarCargos ? [{ href: '/cargos', label: 'Cargos' }] : []),
    ...(mostrarUsuarios ? [{ href: '/usuarios', label: 'Usuários' }] : []),
  ];

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <span className="text-base font-semibold text-slate-900">Doctor Quality</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map((link) => {
          const ativo = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                ativo ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
