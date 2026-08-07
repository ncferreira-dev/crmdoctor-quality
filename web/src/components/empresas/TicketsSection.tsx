'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import { ResultadoPaginado, StatusTicket, Ticket } from '../../types';
import { PRIORIDADE_LABEL, STATUS_TICKET_LABEL, formatarDataHora } from '../../lib/formato';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ErrosForm, focarPrimeiroErro, temErro, validarObrigatorios } from '../../lib/formulario';

const STATUS = Object.keys(STATUS_TICKET_LABEL) as StatusTicket[];

// Prioridade é o que define o prazo de resposta, então merece cor e não só
// texto cinza no meio da linha. Alta usa accent; o resto fica neutro para o
// vermelho não perder peso.
function SeloPrioridade({ prioridade }: { prioridade: number }) {
  const alta = prioridade === 1;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        alta ? 'bg-accent/10 text-accent' : 'bg-surface text-ink/55'
      }`}
    >
      {PRIORIDADE_LABEL[prioridade]}
    </span>
  );
}

// A vida do chamado numa linha: quando entrou, se já foi respondido e quando
// fechou. Antes a tela dizia só a data de abertura, e o prazo de resposta
// existia calculado na API sem aparecer em lugar nenhum: dava para saber que
// um ticket estava atrasado, nunca quanto tempo ainda restava.
function LinhaDoTempo({ ticket }: { ticket: Ticket }) {
  const respondido = Boolean(ticket.primeiraRespostaEm);
  const resolvido = Boolean(ticket.resolvidoEm);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/50">
      <span className="dado">Aberto em {formatarDataHora(ticket.abertoEm)}</span>

      {respondido ? (
        <span className="dado text-brand">
          Respondido em {formatarDataHora(ticket.primeiraRespostaEm as string)}
        </span>
      ) : (
        <span className={`dado ${ticket.emAtraso ? 'text-accent' : ''}`}>
          {ticket.emAtraso ? 'Resposta venceu em ' : 'Responder até '}
          {formatarDataHora(ticket.prazoLimite)}
        </span>
      )}

      {resolvido && (
        <span className="dado">Resolvido em {formatarDataHora(ticket.resolvidoEm as string)}</span>
      )}

      {ticket.registradoPor && <span>Registrado por {ticket.registradoPor.nome}</span>}
    </div>
  );
}

interface TicketsSectionProps {
  empresaId: string;
  // Avisa a página quando um ticket muda. O card "Tickets abertos" lá em cima
  // vem do servidor, num pedido separado desta lista: sem este aviso ele ficava
  // congelado no número da abertura da tela. Reabrir um ticket resolvido dava
  // exatamente a cena que denunciou o defeito, card em 0 com um ticket "Aberto"
  // logo abaixo.
  onMudou?: () => void;
}

export function TicketsSection({ empresaId, onMudou }: TicketsSectionProps) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // null = fechado; { ticket: null } = criando; { ticket } = editando.
  // Um estado só para os dois casos: dois booleanos separados deixariam existir
  // o estado impossível "criando e editando ao mesmo tempo".
  const [modal, setModal] = useState<{ ticket: Ticket | null } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosForm>({});
  const podeEditar = usePermissao('TICKETS_WRITE');

  const carregar = useCallback(() => {
    api
      .get<ResultadoPaginado<Ticket>>(`/tickets?empresaId=${empresaId}`)
      .then((r) => setTickets(r.data))
      .catch((e: Error) => setErro(e.message));
  }, [empresaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Cria ou edita, conforme o modal tenha ticket ou não. A rota de edição
  // (PATCH /tickets/:id) existia desde o começo e nunca teve tela: dava para
  // abrir um chamado e nunca corrigir um erro de digitação no título, nem
  // subir a prioridade quando o cliente cobrava.
  //
  // O corpo manda só título, descrição e prioridade. Status e primeira resposta
  // têm rotas próprias, e mandá-los aqui seria pedido silenciosamente ignorado:
  // o ValidationPipe roda com whitelist e descarta campo fora do DTO sem avisar.
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const achados = validarObrigatorios(form, { titulo: 'Escreva um título para o chamado' });
    setErros(achados);
    if (temErro(achados)) {
      focarPrimeiroErro(achados);
      return;
    }

    const emEdicao = modal?.ticket ?? null;
    const corpo = {
      titulo: String(form.get('titulo')).trim(),
      descricao: String(form.get('descricao')).trim() || undefined,
      prioridade: Number(form.get('prioridade')),
    };

    setSalvando(true);
    setErro(null);
    try {
      if (emEdicao) {
        await api.patch(`/tickets/${emEdicao.id}`, corpo);
      } else {
        await api.post('/tickets', { ...corpo, empresaId });
      }
      setModal(null);
      setErros({});
      carregar();
      onMudou?.();
    } catch (e) {
      const acao = emEdicao ? 'salvar as mudanças do' : 'criar o';
      setErro(e instanceof Error ? e.message : `Não foi possível ${acao} ticket`);
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
      onMudou?.();
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
      onMudou?.();
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
          <Button variante="secondary" onClick={() => setModal({ ticket: null })}>
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
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-ink/10 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-black leading-none text-ink">{ticket.titulo}</p>
                  <SeloPrioridade prioridade={ticket.prioridade} />
                  {ticket.emAtraso && <Badge tom="alerta">Em atraso</Badge>}
                </div>

                {/* A descrição existia no banco e não aparecia em tela nenhuma:
                    a lista mostrava título, prioridade e data, e ninguém
                    conseguia saber do que o chamado tratava sem ir ao banco. */}
                {ticket.descricao && (
                  <p className="mt-1.5 text-xs leading-relaxed text-ink/70">{ticket.descricao}</p>
                )}

                <LinhaDoTempo ticket={ticket} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {podeEditar && (
                  <Button
                    variante="ghost"
                    onClick={() => setModal({ ticket })}
                    aria-label={`Editar ${ticket.titulo}`}
                  >
                    Editar
                  </Button>
                )}
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

      <Modal
        aberto={modal !== null}
        titulo={modal?.ticket ? 'Editar ticket' : 'Novo ticket'}
        onFechar={() => setModal(null)}
      >
        {/* key remonta o formulário ao trocar de ticket: sem isso o
            defaultValue do React guarda o valor do ticket anterior, que é a
            mesma armadilha já documentada no formulário da agenda. */}
        <form
          key={modal?.ticket?.id ?? 'novo'}
          onSubmit={salvar}
          noValidate
          className="flex flex-col gap-3"
        >
          <Input
            id="titulo"
            name="titulo"
            label="Título"
            erro={erros.titulo}
            defaultValue={modal?.ticket?.titulo ?? ''}
            autoFocus
          />
          <Input
            id="descricao"
            name="descricao"
            label="Descrição"
            defaultValue={modal?.ticket?.descricao ?? ''}
          />
          <Select
            id="prioridade"
            name="prioridade"
            label="Prioridade"
            defaultValue={String(modal?.ticket?.prioridade ?? 2)}
            ajuda="A prioridade define o prazo de resposta do chamado."
          >
            <option value="1">Alta</option>
            <option value="2">Média</option>
            <option value="3">Baixa</option>
          </Select>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variante="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : modal?.ticket ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
