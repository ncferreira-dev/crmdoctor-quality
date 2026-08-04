'use client';

import { usePermissao } from '../../hooks/useSessao';
import { SinoNotificacoes } from './SinoNotificacoes';
import { IconeMenu } from '../ui/icons';

interface CabecalhoProps {
  onAbrirMenu: () => void;
}

// Barra fina no topo do conteúdo. Existe por um motivo concreto: o alerta de
// compliance precisava de um lugar fixo para morar, e não havia cabeçalho em
// tela nenhuma.
//
// Deliberadamente quase vazia. Sem título de página (cada tela já tem o seu
// h1, e repetir é ruído), sem busca e sem avatar, que já está na sidebar. É
// clara e não escura para não competir com a sidebar, que é o elemento de
// navegação.
export function Cabecalho({ onAbrirMenu }: CabecalhoProps) {
  const temSino = usePermissao('NOTIFICACOES_READ');

  // Para quem não tem o sino, a barra ficaria vazia. No celular ela continua,
  // porque o botão de menu mora aqui; no desktop a navegação inteira está na
  // sidebar, então uma faixa de 56px sem nada dentro seria só desperdício de
  // tela para quem trabalha em campo. Quando o cabeçalho ganhar mais conteúdo,
  // esta condição sai.
  const escondidoNoDesktop = temSino ? '' : 'lg:hidden';

  return (
    <header
      className={`sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink/10 bg-surface/85 px-4 backdrop-blur lg:px-6 ${escondidoNoDesktop}`}
    >
      {/* No desktop a navegação inteira está na sidebar fixa, então este botão
          só existe no celular, onde ela é gaveta. Antes ele era um botão
          flutuante por cima do conteúdo, cobrindo o título da página. */}
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink/60 transition-colors hover:bg-white hover:text-ink lg:hidden"
      >
        <IconeMenu />
      </button>
      <span className="hidden lg:block" />

      <SinoNotificacoes />
    </header>
  );
}
