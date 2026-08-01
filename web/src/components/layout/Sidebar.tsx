'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { limparSessao } from '../../lib/auth';
import { useSessaoUsuario } from '../../hooks/useSessao';
import {
  ChevronRight,
  IconeAgenda,
  IconeDashboard,
  IconeEmpresas,
  IconeMembros,
  IconeProjetos,
  IconeSair,
} from '../ui/icons';

interface ItemNav {
  href: string;
  label: string;
  icone: ReactNode;
  // Abre um respiro antes do item (agrupamento visual).
  separar?: boolean;
}

// Só entram rotas que EXISTEM. Link que leva a 404 é pior que ausência de link.
const NAV: ItemNav[] = [
  { href: '/dashboard', label: 'Dashboard', icone: <IconeDashboard /> },
  { href: '/empresas', label: 'Empresas', icone: <IconeEmpresas /> },
  { href: '/projetos', label: 'Projetos', icone: <IconeProjetos /> },
  { href: '/agenda', label: 'Agenda', icone: <IconeAgenda /> },
  { href: '/membros', label: 'Membros', icone: <IconeMembros />, separar: true },
];

// Entrada em cascata: os itens deslizam em sequência, 60ms entre cada.
// O estado inicial NÃO usa opacity: 0 nem esconde nada — se a animação falhar
// (variante que não propaga, JS que não roda), o menu precisa continuar
// visível. Navegação que some é falha crítica; animação é enfeite.
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { x: -10 },
  visible: {
    x: 0,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};

// Iniciais do nome como avatar. Evita depender de upload de foto (que não
// existe no modelo) e de imagem externa, que a CSP bloquearia.
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function ConteudoMenu({ aoNavegar }: { aoNavegar?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useSessaoUsuario();

  function sair() {
    limparSessao();
    router.push('/login');
  }

  return (
    <motion.div
      className="flex h-full flex-col"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Perfil do usuário no topo. É o acesso a /perfil (trocar a própria
          senha) — não existe item de menu pra isso, e o bloco com o nome da
          pessoa é onde ela procura. */}
      <motion.div variants={itemVariants}>
        <Link
          href="/perfil"
          onClick={aoNavegar}
          aria-current={pathname === '/perfil' ? 'page' : undefined}
          className="flex items-center gap-3 rounded-md px-4 py-5 transition-colors hover:bg-white/5"
        >
          <div className="dado flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
            {usuario ? iniciais(usuario.nome) : '--'}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-white">
              {usuario?.nome ?? 'Carregando'}
            </span>
            <span className="truncate text-xs text-white/45">{usuario?.email ?? ''}</span>
          </div>
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="mx-4 border-t border-white/10" />

      {/* motion.nav (não <nav> comum): a propagação de variantes do Motion só
          flui por componentes motion. Um elemento comum no meio da cadeia faz
          os filhos nunca receberem "visible" e ficarem invisíveis. */}
      <motion.nav variants={containerVariants} className="mt-3 flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const ativo = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <motion.div
              key={item.href}
              variants={itemVariants}
              className={item.separar ? 'mt-4' : undefined}
            >
              <Link
                href={item.href}
                onClick={aoNavegar}
                aria-current={ativo ? 'page' : undefined}
                className={`group relative flex items-center rounded-md px-3 py-2.5 text-sm transition-colors ${
                  ativo
                    ? 'bg-white/10 font-semibold text-white'
                    : 'font-light text-white/55 hover:bg-white/5 hover:text-white'
                }`}
              >
                {ativo && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                )}
                <span className="mr-3 h-[18px] w-[18px] shrink-0">{item.icone}</span>
                <span>{item.label}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Sair no rodapé */}
      <motion.div variants={itemVariants} className="p-3">
        <button
          type="button"
          onClick={sair}
          className="group flex w-full items-center rounded-md px-3 py-2.5 text-sm font-light text-white/55 transition-colors hover:bg-accent/15 hover:text-accent"
        >
          <span className="mr-3 h-[18px] w-[18px] shrink-0">
            <IconeSair />
          </span>
          <span>Sair</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// Desktop: coluna fixa. Mobile: gaveta — 224px fixos numa tela de 375px
// comeriam 60% do espaço útil.
export function Sidebar() {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 flex-col bg-night lg:flex">
        <ConteudoMenu />
      </aside>

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
              className="h-full w-64 bg-night"
            >
              <ConteudoMenu aoNavegar={() => setAberta(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
