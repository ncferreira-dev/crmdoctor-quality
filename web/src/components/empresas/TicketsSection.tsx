'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import { ResultadoPaginado, StatusTicket, Ticket } from '../../types';
import { PRIORIDADE_LABEL, STATUS_TICKET_LABEL, formatarData } from '../../lib/formato';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

const STATUS = Object.keys(STATUS_TICKET_LABEL) as StatusTicket[];

export function TicketsSection({ empresaId }: { empresaId: string }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const podeEditar = usePermissao('TICKETS_WRITE');

  function carregar() {
    api
      .get<ResultadoPaginado<Ticket>>(`/tickets?empresaId=${empresaId}`)
      .then((r) => setTickets(r.data))
      .catch((e: Error) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    setSalvando(true);
    try {
      await api.post('/tickets', {
        titulo: String(form.get('titulo')),
        descricao: String(form.get('descricao')) || undefined,
        prioridade: Number(form.get('prioridade')),
        empresaId,
      });
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o ticket');
    } finally {
      setSalvando(false);
    }
  }

  // Carimba a primeira resposta. Não é uma caixa de mensagem: o endpoint não
  // recebe texto, só marca a hora. É desse carimbo que depende o "Em atraso" —
  // o ticket fica atrasado enquanto passa do prazo da prioridade sem primeira
  // resposta registrada. Sem esta ação, todo ticket vencido ficava marcado
  // como atrasado para sempre, mesmo já atendido.
  async function registrarResposta(ticket: Ticket) {
    setErro(null);
    try {
      const atualizado = await api.patch<Ticket>(`/tickets/${ticket.id}/responder`);
      setTickets((atual) => atual?.map((t) => (t.id === ticket.id ? atualizado : t)) ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar a resposta');
    }
  }

  async function mudarStatus(ticket: Ticket, status: StatusTicket) {
    // Otimista: reflete na hora, reverte se a API recusar.
    const anterior = tickets;
    setTickets((atual) => atual?.map((t) => (t.id === ticket.id ? { ...t, status } : t)) ?? null);
    try {
      await api.patch(`/tickets/${ticket.id}/status`, { status });
    } catch (e) {
      setTickets(anterior);
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar o status');
    }
  }

  return (
    <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-light uppercase tracking-wide text-ink/60">Tickets</span>
        {podeEditar && (
          <Button variante="secondary" onClick={() => setModalAberto(true)}>
            Novo ticket
          </Button>
        )}
      </div>

      {erro && <p className="mb-2 text-xs text-accent">{erro}</p>}

      {!tickets ? (
        <div className="h-16 animate-pulse rounded-card bg-surface" />
      ) : tickets.length === 0 ? (
        <p className="text-xs text-ink/40">Nenhum ticket para esta empresa.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink/10 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-black leading-none text-ink">{ticket.titulo}</p>
                  {ticket.emAtraso && <Badge tom="alerta">Em atraso</Badge>}
                </div>
                <p className="mt-1 text-xs text-ink/60">
                  {PRIORIDADE_LABEL[ticket.prioridade]} · aberto em {formatarData(ticket.abertoEm)}
                  {ticket.primeiraRespostaEm
                    ? ` · respondido em ${formatarData(ticket.primeiraRespostaEm)}`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {podeEditar && !ticket.primeiraRespostaEm && (
                  <Button variante="secondary" onClick={() => registrarResposta(ticket)}>
                    Registrar resposta
                  </Button>
                )}
                {podeEditar ? (
                  <Select
                    tamanho="compacto"
                    value={ticket.status}
                    onChange={(e) => mudarStatus(ticket, e.target.value as StatusTicket)}
                    aria-label={`Status do ticket ${ticket.titulo}`}
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_TICKET_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge>{STATUS_TICKET_LABEL[ticket.status]}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal aberto={modalAberto} titulo="Novo ticket" onFechar={() => setModalAberto(false)}>
        <form onSubmit={criar} className="flex flex-col gap-3">
          <Input id="titulo" name="titulo" label="Título" required />
          <Input id="descricao" name="descricao" label="Descrição" />
          <Select id="prioridade" name="prioridade" label="Prioridade" defaultValue="2">
            <option value="1">Alta</option>
            <option value="2">Média</option>
            <option value="3">Baixa</option>
          </Select>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variante="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
