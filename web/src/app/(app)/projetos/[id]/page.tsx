'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { usePermissao } from '../../../../hooks/useSessao';
import { EstagioProjeto, Projeto } from '../../../../types';
import {
  ESTAGIOS_PROJETO,
  ESTAGIO_PROJETO_LABEL,
  formatarData,
} from '../../../../lib/formato';
import { Button } from '../../../../components/ui/Button';
import { SeloPrazo } from '../../../../components/projetos/SeloPrazo';
import { EtapasSection } from '../../../../components/projetos/EtapasSection';
import { ProjetoFormModal } from '../../../../components/projetos/ProjetoFormModal';

export default function ProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const podeEditar = usePermissao('PROJETOS_WRITE');

  function carregar() {
    api
      .get<Projeto>(`/projetos/${id}`)
      .then(setProjeto)
      .catch((e: Error) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, [id]);

  async function mudarEstagio(estagio: EstagioProjeto) {
    if (!projeto) return;
    const anterior = projeto;
    setProjeto({ ...projeto, estagio });
    try {
      await api.patch(`/projetos/${id}/estagio`, { estagio });
    } catch (e) {
      setProjeto(anterior);
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar o estágio');
    }
  }

  if (erro && !projeto) {
    return <p className="text-sm text-ink/60">Não foi possível carregar o projeto: {erro}</p>;
  }

  if (!projeto) {
    return <div className="h-40 animate-pulse rounded-card bg-white/60" />;
  }

  const valor = projeto.valor
    ? Number(projeto.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/projetos"
          className="text-xs uppercase tracking-wide text-ink/50 hover:text-brand"
        >
          ← Projetos
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="titulo-pagina">{projeto.titulo}</h1>
            {projeto.empresa && (
              <Link
                href={`/empresas/${projeto.empresaId}`}
                className="mt-1.5 inline-block text-sm text-ink/55 hover:text-brand"
              >
                {projeto.empresa.nome}
              </Link>
            )}
          </div>
          {podeEditar && (
            <Button variante="secondary" onClick={() => setEditando(true)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-accent">
          {erro}
        </p>
      )}

      {/* Prazo em destaque: é o dado que define o produto. */}
      <div className="flex flex-wrap items-center gap-4 rounded-card border border-ink/10 bg-white p-5 shadow-card">
        <div>
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">
            Prazo de compliance
          </p>
          <div className="mt-2 flex items-center gap-3">
            <SeloPrazo prazo={projeto.dataLimiteCompliance} />
            {projeto.dataLimiteCompliance && (
              <span className="dado text-sm text-ink/60">
                {formatarData(projeto.dataLimiteCompliance)}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">Valor</p>
          <p className="dado mt-2 text-lg font-semibold leading-none text-ink">{valor}</p>
        </div>
      </div>

      {/* Estágio do projeto como trilha clicável */}
      <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
        <p className="mb-3 text-xs font-light uppercase tracking-wide text-ink/60">Estágio</p>
        <div className="flex flex-wrap gap-1">
          {ESTAGIOS_PROJETO.map((estagio) => {
            const atual = projeto.estagio === estagio;
            return (
              <button
                key={estagio}
                type="button"
                disabled={!podeEditar}
                aria-current={atual ? 'step' : undefined}
                onClick={() => mudarEstagio(estagio)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  atual
                    ? 'bg-brand text-white'
                    : podeEditar
                      ? 'text-ink/60 hover:bg-surface'
                      : 'text-ink/40'
                }`}
              >
                {ESTAGIO_PROJETO_LABEL[estagio]}
              </button>
            );
          })}
        </div>
      </div>

      {projeto.descricao && (
        <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <p className="mb-2 text-xs font-light uppercase tracking-wide text-ink/60">Descrição</p>
          <p className="text-sm leading-relaxed text-ink/80">{projeto.descricao}</p>
        </div>
      )}

      <EtapasSection projetoId={id} etapas={projeto.etapas ?? []} onMudou={carregar} />

      <ProjetoFormModal
        aberto={editando}
        projeto={projeto}
        onFechar={() => setEditando(false)}
        onMudou={() => {
          setEditando(false);
          carregar();
        }}
      />
    </div>
  );
}
