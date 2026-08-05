'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

// SEM `motion` nenhum, nem na entrada nem na saída, e isso é decisão de
// engenharia, não de gosto. Dois defeitos diferentes já saíram daqui:
//
// 1. Saída (corrigido em 04/08): com AnimatePresence, o nó nunca saía do DOM.
//    Sobrava um `fixed inset-0 z-50` invisível engolindo todo clique da tela,
//    e como este Modal é o de todas as telas, o sistema inteiro travava depois
//    do primeiro modal aberto.
// 2. Entrada (corrigido em 05/08): o motor do `motion` depende de
//    requestAnimationFrame. Com a aba em segundo plano ou a janela oculta o rAF
//    não roda, e a animação congela no primeiro quadro: modal presoem
//    opacity 0.35 com escala 0.98, campos amassados um sobre o outro, ou
//    invisível de vez. Medido nesta base: com a janela oculta, a opacidade
//    ficou parada em 0.357 indefinidamente.
//
// Agora a entrada é CSS (`overlay-fundo` e `overlay-painel` em globals.css) e
// o estado final é o estado base: se a animação não rodar, o modal aparece
// pronto em vez de sumir. A saída é imediata, que é preço baixo perto de
// perder a tela.
export function Modal({ aberto, titulo, onFechar, children }: ModalProps) {
  // Esc fecha (QA checklist: todo overlay precisa ter saída por teclado).
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="overlay-fundo fixed inset-0 z-50 flex items-center justify-center bg-night/50 p-4"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        // Clique dentro não fecha; só no backdrop.
        onClick={(evento) => evento.stopPropagation()}
        className="overlay-painel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-6 shadow-overlay"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-black leading-none tracking-tight text-ink">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            className="-mr-1 -mt-1 rounded p-1 text-ink/40 transition-colors hover:bg-surface hover:text-ink"
            aria-label="Fechar"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
