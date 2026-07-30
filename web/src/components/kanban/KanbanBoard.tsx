'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { temPermissao } from '../../lib/auth';
import { EstagioLead, Lead, ResultadoPaginado } from '../../types';
import { KanbanColumn } from './KanbanColumn';

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
  const [podeEditar, setPodeEditar] = useState(false);
  const [idArrastando, setIdArrastando] = useState<string | null>(null);
  const [colunaSobre, setColunaSobre] = useState<EstagioLead | null>(null);
  const [erroMovimento, setErroMovimento] = useState<string | null>(null);

  useEffect(() => {
    setPodeEditar(temPermissao('LEADS_WRITE'));
    api
      .get<ResultadoPaginado<Lead>>(`/leads?limit=${LIMITE_BOARD}`)
      .then((resultado) => setLeads(resultado.data))
      .catch((error: Error) => setErro(error.message));
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
      {erroMovimento ? <p className="mb-3 text-xs text-accent">{erroMovimento}</p> : null}
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
    </div>
  );
}
