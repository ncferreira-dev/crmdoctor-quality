'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Só entram rotas que EXISTEM. Link que leva a 404 é pior que ausência de link:
// ensina o usuário a desconfiar da navegação. Conforme cada tela for entregue
// (Tickets, Consultores), ela volta pra cá.
const LINKS_BASE = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/projetos', label: 'Projetos' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/membros', label: 'Membros' },
];

function Marca() {
  return (
    <div className="px-5 py-6">
      <span className="block text-[15px] font-black leading-none tracking-tight text-white">
        Doctor Quality
      </span>
      <span className="mt-1.5 block text-[10px] font-light uppercase tracking-[0.18em] text-white/40">
        Compliance
      </span>
    </div>
  );
}

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {LINKS_BASE.map((link) => {
        const ativo = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={aoNavegar}
            aria-current={ativo ? 'page' : undefined}
            className={`relative rounded-md px-3 py-2 text-sm transition-colors ${
              ativo
                ? 'bg-white/10 font-semibold text-white'
                : 'font-light text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {ativo && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Desktop: coluna fixa. Mobile: gaveta sobre o conteúdo — 224px fixos numa tela
// de 375px comeriam 60% do espaço útil.
export function Sidebar() {
  // Fechar ao navegar é responsabilidade do onClick do link (aoNavegar), não
  // de um effect observando o pathname — que dispararia render em cascata.
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <aside className="hidden h-screen w-56 shrink-0 flex-col bg-night lg:flex">
        <Marca />
        <Navegacao />
      </aside>

      {/* Botão de menu (só mobile) */}
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir menu"
        className="fixed left-3 top-3 z-40 rounded-md bg-night p-2 text-white lg:hidden"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <AnimatePresence>
        {aberta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setAberta(false)}
            className="fixed inset-0 z-50 bg-night/50 lg:hidden"
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-64 flex-col bg-night"
            >
              <Marca />
              <Navegacao aoNavegar={() => setAberta(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
