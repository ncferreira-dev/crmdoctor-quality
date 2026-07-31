'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import { EstagioLead, Lead, ResultadoPaginado } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { LeadFormModal } from './LeadFormModal';
import { Button } from '../ui/Button';

const ESTAGIOS: { valor: EstagioLead; titulo: string }[] = [
  { valor: 'NOVO', titulo: 'Novo' },
  { valor: 'CONTATO_FEITO', titulo: 'Contato feito' },
  { valor: 'QUALIFICADO', titulo: 'Qualificado' },
  { valor: 'PROPOSTA', titulo: 'Proposta' },
  { valor: 'GANHO', titulo: 'Ganho' },
  { valor: 'PERDIDO', titulo: 'Perdido' },
];

// Teto do endpoint paginado (ver PaginacaoDto no backend). Um board de leads
// ativos de uma empresa de médio porte cabe aqui; se passar de 100 o board
// mostra só os 100 mais recentes — precisa virar endpoint dedicado depois.
const LIMITE_BOARD = 100;

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const podeEditar = usePermissao('LEADS_WRITE');
  const [idArrastando, setIdArrastando] = useState<string | null>(null);
  const [colunaSobre, setColunaSobre] = useState<EstagioLead | null>(null);
  const [erroMovimento, setErroMovimento] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    aberto: boolean;
    lead: Lead | null;
    estagio?: EstagioLead;
  }>({ aberto: false, lead: null });

  function carregar() {
    api
      .get<ResultadoPaginado<Lead>>(`/leads?limit=${LIMITE_BOARD}`)
      .then((resultado) => setLeads(resultado.data))
      .catch((error: Error) => setErro(error.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  const leadsPorEstagio = useMemo(() => {
    const mapa = new Map<EstagioLead, Lead[]>();
    for (const estagio of ESTAGIOS) mapa.set(estagio.valor, []);
    for (const lead of leads ?? []) {
      mapa.get(lead.estagio)?.push(lead);
    }
    return mapa;
  }, [leads]);

  async function moverLead(id: string, novoEstagio: EstagioLead) {
    if (!leads) return;
    const leadAtual = leads.find((item) => item.id === id);
    if (!leadAtual || leadAtual.estagio === novoEstagio) return;

    const leadsAnteriores = leads;
    setLeads(leads.map((item) => (item.id === id ? { ...item, estagio: novoEstagio } : item)));
    setErroMovimento(null);

    try {
      await api.patch(`/leads/${id}/estagio`, { estagio: novoEstagio });
    } catch (error) {
      setLeads(leadsAnteriores);
      setErroMovimento(error instanceof Error ? error.message : 'Não foi possível mover o lead');
    }
  }

  if (erro) {
    return <p className="text-sm text-ink/60">Não foi possível carregar os leads: {erro}</p>;
  }

  if (!leads) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ESTAGIOS.map((estagio) => (
          <div key={estagio.valor} className="h-64 w-72 shrink-0 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="titulo-pagina">Leads</h1>
        {podeEditar && (
          <Button onClick={() => setModal({ aberto: true, lead: null })}>Novo lead</Button>
        )}
      </div>

      {erroMovimento ? (
        <p role="alert" className="mb-3 text-xs text-accent">
          {erroMovimento}
        </p>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {ESTAGIOS.map((estagio) => (
          <KanbanColumn
            key={estagio.valor}
            estagio={estagio.valor}
            titulo={estagio.titulo}
            leads={leadsPorEstagio.get(estagio.valor) ?? []}
            podeEditar={podeEditar}
            idEmMovimento={idArrastando}
            sobreColuna={colunaSobre === estagio.valor}
            onDragStartCard={setIdArrastando}
            onSelecionarLead={(lead) => setModal({ aberto: true, lead })}
            onNovoNaColuna={(est) => setModal({ aberto: true, lead: null, estagio: est })}
            onDragEndCard={() => {
              setIdArrastando(null);
              setColunaSobre(null);
            }}
            onDragOverColuna={setColunaSobre}
            onDragLeaveColuna={() => setColunaSobre(null)}
            onDropColuna={(estagioDestino) => {
              if (idArrastando) void moverLead(idArrastando, estagioDestino);
              setIdArrastando(null);
              setColunaSobre(null);
            }}
          />
        ))}
      </div>

      <LeadFormModal
        aberto={modal.aberto}
        lead={modal.lead}
        estagioInicial={modal.estagio}
        onFechar={() => setModal({ aberto: false, lead: null })}
        onMudou={() => {
          setModal({ aberto: false, lead: null });
          carregar();
        }}
      />
    </div>
  );
}
