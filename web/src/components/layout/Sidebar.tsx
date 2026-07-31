'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Só entram rotas que EXISTEM. Link que leva a 404 é pior que ausência de link:
// ensina o usuário a desconfiar da navegação. Conforme cada tela for entregue
// (Projetos, Tickets, Consultores), ela volta pra cá.
const LINKS_BASE = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/agenda', label: 'Agenda' },
];

export function Sidebar() {
  const pathname = usePathname();

  // Cargos e Usuários saem daqui até as telas existirem — eram condicionais por
  // permissão, mas o admin tem as duas e caía em 404. Quando as páginas forem
  // entregues, voltam com o gate de CARGOS_MANAGE / USUARIOS_MANAGE.
  const links = LINKS_BASE;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-night">
      <div className="px-5 py-6">
        <span className="block text-[15px] font-black leading-none tracking-tight text-white">
          Doctor Quality
        </span>
        <span className="mt-1.5 block text-[10px] font-light uppercase tracking-[0.18em] text-white/40">
          Compliance
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {links.map((link) => {
          const ativo = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={ativo ? 'page' : undefined}
              className={`relative rounded-md px-3 py-2 text-sm transition-colors ${
                ativo
                  ? 'bg-white/10 font-semibold text-white'
                  : 'font-light text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {/* Marcador accent: sinaliza a página atual por cor da marca, não
                  só por contraste de fundo. */}
              {ativo && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
              )}
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
