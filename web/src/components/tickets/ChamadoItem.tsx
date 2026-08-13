'use client';

import Link from 'next/link';
import { StatusTicket, Ticket } from '../../types';
import { PRIORIDADE_LABEL, STATUS_TICKET_LABEL, formatarDataHora } from '../../lib/formato';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

// A linha do chamado, uma só para as duas telas que a desenham: a lista global
// de /tickets e o bloco dentro da empresa.
//
// Antes ela existia só dentro de `TicketsSection`. Copiar para a tela nova
// criaria duas versões da mesma linha, e a segunda envelheceria: o selo de
// atraso ganharia uma cor aqui e não lá, o botão de resposta sumiria de um lado
// numa refatoração e ninguém veria. É a duplicação de lógica que o CLAUDE.md
// trata como defeito de padrão.

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

interface ChamadoItemProps {
  ticket: Ticket;
  podeEditar: boolean;
  // Dentro da tela da empresa o nome do cliente já está no cabeçalho, e
  // repeti-lo em toda linha é ruído. Na lista global ele é a primeira coisa que
  // a pessoa procura.
  mostrarEmpresa?: boolean;
  onEditar: (ticket: Ticket) => void;
  onRegistrarResposta: (ticket: Ticket) => void;
  onMudarStatus: (ticket: Ticket, status: StatusTicket) => void;
  // Enquanto a resposta está sendo carimbada, para o botão não aceitar dois
  // cliques e gerar o 409 de "já teve a primeira resposta registrada".
  registrandoResposta?: boolean;
}

export function ChamadoItem({
  ticket,
  podeEditar,
  mostrarEmpresa = false,
  onEditar,
  onRegistrarResposta,
  onMudarStatus,
  registrandoResposta = false,
}: ChamadoItemProps) {
  return (
    <div
      // `emAtraso` vem da API e já considera o status: chamado resolvido nunca
      // volta marcado como atrasado. Repetir a checagem aqui criaria uma
      // segunda versão da mesma regra no navegador.
      className={`flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 ${
        ticket.emAtraso ? 'border-accent/30 bg-accent/[0.03]' : 'border-ink/10'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-black leading-none text-ink">{ticket.titulo}</p>
          <SeloPrioridade prioridade={ticket.prioridade} />
          {ticket.emAtraso && <Badge tom="alerta">Em atraso</Badge>}
        </div>

        {/* De quem é o chamado, e o caminho até o cliente. Sem este link a
            lista global obrigava a decorar o nome, sair para Empresas e
            procurar de novo para ver o resto do relacionamento. */}
        {mostrarEmpresa && ticket.empresa && (
          <Link
            href={`/empresas/${ticket.empresa.id}`}
            className="mt-1 inline-block text-xs text-brand underline-offset-2 hover:underline"
          >
            {ticket.empresa.nome}
          </Link>
        )}

        {/* A descrição existia no banco e não aparecia em tela nenhuma:
            a lista mostrava título, prioridade e data, e ninguém
            conseguia saber do que o chamado tratava sem ir ao banco. */}
        {ticket.descricao && (
          <p className="mt-1.5 text-xs leading-relaxed text-ink/70">{ticket.descricao}</p>
        )}

        <LinhaDoTempo ticket={ticket} />
      </div>

      {/* `flex-wrap` e não `shrink-0`: medido em 390px, o grupo de ações era
          mais largo que o card e o seletor de status saía pela direita,
          cortado. Em tela larga o comportamento é o mesmo de antes, porque aí
          o grupo cabe numa linha só. */}
      <div className="flex flex-wrap items-center gap-2">
        {podeEditar && (
          <Button
            variante="ghost"
            onClick={() => onEditar(ticket)}
            aria-label={`Editar ${ticket.titulo}`}
          >
            Editar
          </Button>
        )}
        {/* Não se registra primeira resposta em chamado fechado. A ação
            aparecia em chamado resolvido sem carimbo de resposta, e carimbar
            ali só grava uma data que não aconteceu. */}
        {podeEditar && !ticket.primeiraRespostaEm && ticket.status !== 'RESOLVIDO' && (
          <Button
            variante="secondary"
            disabled={registrandoResposta}
            onClick={() => onRegistrarResposta(ticket)}
          >
            {registrandoResposta ? 'Registrando...' : 'Registrar resposta'}
          </Button>
        )}
        {podeEditar ? (
          <Select
            tamanho="compacto"
            value={ticket.status}
            onChange={(e) => onMudarStatus(ticket, e.target.value as StatusTicket)}
            aria-label={`Status do chamado ${ticket.titulo}`}
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
  );
}
