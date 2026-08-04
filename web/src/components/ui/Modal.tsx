'use client';

import { ReactNode, useEffect } from 'react';
import { motion } from 'motion/react';

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

// SEM AnimatePresence de propósito. Com ele (motion 12.43 + React 19.2 + Next
// 16), a animação de saída rodava até o fim e o nó NUNCA saía do DOM: sobrava
// um backdrop fixed inset-0 z-50 com opacity 0 e pointer-events auto por cima
// da tela inteira. Visualmente o modal sumia, mas todo clique seguinte morria
// no overlay invisível, e a única saída era recarregar a página. Como este é o
// Modal de todas as telas, isso travava o sistema inteiro depois do primeiro
// modal aberto. A entrada continua animada; a saída é imediata, que é um preço
// baixo perto de perder a tela.
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/50 p-4"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        // Clique dentro não fecha; só no backdrop.
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-6 shadow-overlay"
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
      </motion.div>
    </motion.div>
  );
}
