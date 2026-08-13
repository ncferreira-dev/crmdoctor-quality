'use client';

import { useState } from 'react';
import { usePermissao } from '../../hooks/useSessao';
import { useChamados } from '../../hooks/useChamados';
import { Ticket } from '../../types';
import { Button } from '../ui/Button';
import { ChamadoItem } from '../tickets/ChamadoItem';
import { ChamadoFormModal } from '../tickets/ChamadoFormModal';

interface TicketsSectionProps {
  empresaId: string;
  // Avisa a página quando um chamado muda. O card "Tickets abertos" lá em cima
  // vem do servidor, num pedido separado desta lista: sem este aviso ele ficava
  // congelado no número da abertura da tela. Reabrir um chamado resolvido dava
  // exatamente a cena que denunciou o defeito, card em 0 com um chamado
  // "Aberto" logo abaixo.
  onMudou?: () => void;
}

// O bloco de chamados dentro da tela da empresa. A linha, o formulário e as
// ações são os mesmos da tela de Chamados: aqui fica só o recorte (uma empresa
// só) e a moldura do card. Ver components/tickets/.
export function TicketsSection({ empresaId, onMudou }: TicketsSectionProps) {
  const [modal, setModal] = useState<{ ticket: Ticket | null } | null>(null);
  const podeEditar = usePermissao('TICKETS_WRITE');
  const {
    chamados,
    erro,
    respondendoId,
    recarregar,
    registrarResposta,
    mudarStatus,
  } = useChamados(`/tickets?empresaId=${empresaId}`, onMudou);

  return (
    <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-light uppercase tracking-wide text-ink/60">Chamados</span>
        {podeEditar && (
          <Button variante="secondary" onClick={() => setModal({ ticket: null })}>
            Novo chamado
          </Button>
        )}
      </div>

      {erro && (
        <p role="alert" className="mb-2 text-xs text-accent">
          {erro}
        </p>
      )}

      {!chamados ? (
        <div className="h-16 animate-pulse rounded-card bg-surface" />
      ) : chamados.length === 0 ? (
        <p className="text-xs text-ink/40">Nenhum chamado para esta empresa.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {chamados.map((ticket) => (
            <ChamadoItem
              key={ticket.id}
              ticket={ticket}
              podeEditar={podeEditar}
              registrandoResposta={respondendoId === ticket.id}
              onEditar={(alvo) => setModal({ ticket: alvo })}
              onRegistrarResposta={registrarResposta}
              onMudarStatus={mudarStatus}
            />
          ))}
        </div>
      )}

      <ChamadoFormModal
        aberto={modal !== null}
        ticket={modal?.ticket ?? null}
        empresaFixaId={empresaId}
        onFechar={() => setModal(null)}
        onSalvo={() => {
          setModal(null);
          recarregar();
          onMudou?.();
        }}
      />
    </div>
  );
}
