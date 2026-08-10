'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { limparSessao } from '../../lib/auth';
import { limparAlertas } from '../../lib/alertas';
import { usePermissao, useSessaoUsuario } from '../../hooks/useSessao';
import { Permissao } from '../../types';
import {
  ChevronRight,
  IconeAgenda,
  IconeCargos,
  IconeCompetencias,
  IconeDashboard,
  IconeEmpresas,
  IconeMembros,
  IconeProjetos,
  IconeSair,
  IconeTarefas,
} from '../ui/icons';

interface ItemNav {
  href: string;
  label: string;
  icone: ReactNode;
  // Abre um respiro antes do item (agrupamento visual).
  separar?: boolean;
  // Quando presente, o item some para quem não tem a permissão. Menu que leva
  // a uma tela onde a pessoa não pode fazer nada é ruído, não descoberta.
  permissao?: Permissao;
}

// Só entram rotas que EXISTEM. Link que leva a 404 é pior que ausência de link.
const NAV: ItemNav[] = [
  { href: '/dashboard', label: 'Dashboard', icone: <IconeDashboard /> },
  { href: '/empresas', label: 'Empresas', icone: <IconeEmpresas /> },
  { href: '/projetos', label: 'Projetos', icone: <IconeProjetos /> },
  { href: '/agenda', label: 'Agenda', icone: <IconeAgenda /> },
  { href: '/tarefas', label: 'Minhas tarefas', icone: <IconeTarefas />, permissao: 'TAREFAS_READ' },
  { href: '/membros', label: 'Membros', icone: <IconeMembros />, separar: true, permissao: 'USUARIOS_READ' },
  { href: '/competencias', label: 'Competências', icone: <IconeCompetencias />, permissao: 'COMPETENCIAS_READ' },
  { href: '/cargos', label: 'Cargos', icone: <IconeCargos />, permissao: 'CARGOS_MANAGE' },
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
  // Um hook por permissão usada no menu, porque hook não roda dentro de laço.
  const concedida: Partial<Record<Permissao, boolean>> = {
    CARGOS_MANAGE: usePermissao('CARGOS_MANAGE'),
    USUARIOS_READ: usePermissao('USUARIOS_READ'),
    COMPETENCIAS_READ: usePermissao('COMPETENCIAS_READ'),
    TAREFAS_READ: usePermissao('TAREFAS_READ'),
  };
  const itensVisiveis = NAV.filter((item) => !item.permissao || concedida[item.permissao]);

  function sair() {
    limparSessao();
    // Os alertas vivem em memória, fora do localStorage: sem limpar aqui, quem
    // entrasse em seguida na mesma aba veria os alertas da sessão anterior.
    limparAlertas();
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
          {/* Sem iniciais, o círculo fica só apagado. Antes escrevia "--", que
              parecia dado faltando em vez do meio segundo entre montar a tela e
              ler a sessão. */}
          <div
            className={`dado flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
              usuario ? 'bg-brand' : 'bg-white/10'
            }`}
          >
            {usuario ? iniciais(usuario.nome) : ''}
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
        {itensVisiveis.map((item) => {
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

interface SidebarProps {
  // A gaveta do celular é controlada de fora porque quem a abre é o botão do
  // cabeçalho, que vive em outra coluna do layout.
  aberta: boolean;
  onFechar: () => void;
}

// Desktop: coluna fixa. Mobile: gaveta — 224px fixos numa tela de 375px
// comeriam 60% do espaço útil.
export function Sidebar({ aberta, onFechar }: SidebarProps) {
  // Esc fecha a gaveta, como já fechava o Modal. Não é só teclado de mesa: no
  // celular a gaveta cobre a tela inteira, e quem chega nela por engano precisa
  // de mais de uma saída. O ouvinte só existe enquanto ela está aberta, senão
  // seria um Esc global capturado por um menu que nem está na tela.
  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberta, onFechar]);

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 flex-col bg-night lg:flex">
        <ConteudoMenu />
      </aside>

      {/* Sem AnimatePresence, pelo mesmo motivo documentado em ui/Modal.tsx: a
          saída animava até o fim e o nó ficava no DOM com opacity 0 e
          pointer-events auto. No celular isso matava a tela inteira depois da
          primeira vez que o menu abrisse, e o consultor usa isto em campo.

          O fundo NÃO tem mais entrada em opacity. Ele já nasce com a cor final:
          quem entra deslizando é a gaveta, por transform. O fade custava 150ms
          de risco pelo qual esta base já pagou duas vezes, e o pior caso dele é
          exatamente o defeito de 04/08: um retângulo invisível cobrindo a tela
          inteira e comendo todo toque. Um scrim que aparece de uma vez é o
          preço barato de nunca mais ter isso. */}
      {aberta && (
        <div
          onClick={onFechar}
          className="fixed inset-0 z-50 bg-night/50 lg:hidden"
        >
          {/* O deslize é CSS (.gaveta-entra), não motion. Medido em 390px com a
              aba em segundo plano: com o motion a gaveta parava em
              translateX(-130px) e ficava assim, metade fora da tela, porque o
              motion escreve o transform quadro a quadro e o laço não avança.
              Por CSS o pior caso é não animar, e aí ela aparece inteira. */}
          <aside
            onClick={(e) => e.stopPropagation()}
            className="gaveta-entra h-full w-64 bg-night"
          >
            <ConteudoMenu aoNavegar={onFechar} />
          </aside>
        </div>
      )}
    </>
  );
}
