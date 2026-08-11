'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, statusDoErro } from '../../../lib/api';
import { usePermissao } from '../../../hooks/useSessao';
import { EstagioProjeto, Projeto } from '../../../types';
import {
  ESTAGIOS_PROJETO,
  ESTAGIO_PROJETO_LABEL,
  urgenciaDoPrazo,
} from '../../../lib/formato';
import { Button } from '../../../components/ui/Button';
import { EstadoErro } from '../../../components/ui/EstadoErro';
import { Badge } from '../../../components/ui/Badge';
import { SeloPrazo } from '../../../components/projetos/SeloPrazo';
import { ProjetoFormModal } from '../../../components/projetos/ProjetoFormModal';

// Peso de urgência pra ordenação: o que está vencido ou perto vem primeiro.
// Num CRM de compliance, ordenar por data de criação esconde o que queima.
const PESO_URGENCIA: Record<string, number> = {
  vencido: 0,
  critico: 1,
  proximo: 2,
  tranquilo: 3,
  'sem-prazo': 4,
};

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O status vem junto do texto: é ele que separa "seu cargo não tem acesso"
  // de "deu erro, tente de novo". Ver EstadoErro.
  const [statusErro, setStatusErro] = useState<number | undefined>(undefined);
  const [filtroEstagio, setFiltroEstagio] = useState<EstagioProjeto | ''>('');
  const [modal, setModal] = useState<{ aberto: boolean; projeto: Projeto | null }>({
    aberto: false,
    projeto: null,
  });
  const podeEditar = usePermissao('PROJETOS_WRITE');

  function carregar() {
    api
      .getTodos<Projeto>('/projetos')
      .then(setProjetos)
      .catch((e: Error) => {
        setErro(e.message);
        setStatusErro(statusDoErro(e));
      });
  }

  useEffect(() => {
    carregar();
  }, []);

  const visiveis = useMemo(() => {
    const lista = (projetos ?? []).filter((p) => !filtroEstagio || p.estagio === filtroEstagio);
    return [...lista].sort((a, b) => {
      const pa = PESO_URGENCIA[urgenciaDoPrazo(a.dataLimiteCompliance)];
      const pb = PESO_URGENCIA[urgenciaDoPrazo(b.dataLimiteCompliance)];
      if (pa !== pb) return pa - pb;
      // Mesmo grau de urgência: o de prazo mais próximo primeiro.
      const da = a.dataLimiteCompliance ? new Date(a.dataLimiteCompliance).getTime() : Infinity;
      const db = b.dataLimiteCompliance ? new Date(b.dataLimiteCompliance).getTime() : Infinity;
      return da - db;
    });
  }, [projetos, filtroEstagio]);

  const emRisco = useMemo(
    () =>
      (projetos ?? []).filter((p) => {
        const u = urgenciaDoPrazo(p.dataLimiteCompliance);
        return (u === 'vencido' || u === 'critico') && p.estagio !== 'CONCLUIDO';
      }).length,
    [projetos],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="titulo-pagina">Projetos</h1>
          {emRisco > 0 && (
            <Badge tom="alerta">
              {emRisco} {emRisco === 1 ? 'prazo em risco' : 'prazos em risco'}
            </Badge>
          )}
        </div>
        {podeEditar && (
          <Button onClick={() => setModal({ aberto: true, projeto: null })}>Novo projeto</Button>
        )}
      </div>

      {/* Filtro por estágio.
          O rótulo "Filtrar por" não é enfeite: estes botões são idênticos aos da
          trilha de estágio da tela do projeto, e sem nada dizendo o contrário a
          pessoa clica aqui esperando MUDAR o estágio de algo. Aqui só escolhe o
          que a lista mostra. */}
      <div className="mb-4 flex flex-wrap items-center gap-1">
        <span className="mr-2 text-xs font-light uppercase tracking-wide text-ink/45">
          Filtrar por
        </span>
        <button
          type="button"
          onClick={() => setFiltroEstagio('')}
          className={`min-h-9 rounded-md px-3 text-sm transition-colors ${
            filtroEstagio === '' ? 'bg-brand text-white' : 'text-ink/60 hover:bg-white'
          }`}
        >
          Todos
        </button>
        {ESTAGIOS_PROJETO.map((estagio) => (
          <button
            key={estagio}
            type="button"
            onClick={() => setFiltroEstagio(estagio)}
            className={`min-h-9 rounded-md px-3 text-sm transition-colors ${
              filtroEstagio === estagio ? 'bg-brand text-white' : 'text-ink/60 hover:bg-white'
            }`}
          >
            {ESTAGIO_PROJETO_LABEL[estagio]}
          </button>
        ))}
      </div>

      {erro ? (
        <EstadoErro
          oQue="os projetos"
          detalhe={erro}
          status={statusErro}
          onTentarDeNovo={() => {
            setErro(null);
            carregar();
          }}
        />
      ) : !projetos ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-white/60" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink/50">
            {filtroEstagio ? 'Nenhum projeto neste estágio.' : 'Nenhum projeto cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visiveis.map((projeto) => (
            <Link
              key={projeto.id}
              href={`/projetos/${projeto.id}`}
              className="flex items-center justify-between gap-4 rounded-card border border-ink/10 bg-white p-4 shadow-card transition-colors hover:border-brand/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold leading-tight text-ink">{projeto.titulo}</p>
                  {/* Projeto de demonstração fica na lista, e diz que é. Ele
                      não entra em número nenhum do dashboard. */}
                  {projeto.demonstracao && <Badge>Demonstração</Badge>}
                </div>
                <p className="mt-1 text-xs text-ink/55">
                  {projeto.empresa?.nome ?? 'Empresa'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>{ESTAGIO_PROJETO_LABEL[projeto.estagio]}</Badge>
                {/* Projeto concluído não cobra prazo de ninguém: mesmo critério
                      já usado em tarefa e marco concluídos. */}
                  {projeto.estagio !== 'CONCLUIDO' && (
                    <SeloPrazo prazo={projeto.dataLimiteCompliance} />
                  )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <ProjetoFormModal
        // Remonta ao trocar de projeto: sem isto a equipe marcada seria a do
        // projeto aberto antes.
        key={modal.projeto?.id ?? 'novo'}
        aberto={modal.aberto}
        projeto={modal.projeto}
        onFechar={() => setModal({ aberto: false, projeto: null })}
        onMudou={() => {
          setModal({ aberto: false, projeto: null });
          carregar();
        }}
      />
    </div>
  );
}
