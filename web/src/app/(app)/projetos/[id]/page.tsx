'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { usePermissao } from '../../../../hooks/useSessao';
import { EstagioProjeto, Projeto } from '../../../../types';
import {
  ESTAGIOS_PROJETO,
  ESTAGIO_PROJETO_DESCRICAO,
  ESTAGIO_PROJETO_LABEL,
  formatarDataCivil,
  proximoEstagio,
} from '../../../../lib/formato';
import { Button } from '../../../../components/ui/Button';
import { EstadoErro } from '../../../../components/ui/EstadoErro';
import { SeloPrazo } from '../../../../components/projetos/SeloPrazo';
import { EtapasSection } from '../../../../components/projetos/EtapasSection';
import { Timeline } from '../../../../components/interacoes/Timeline';
import { ProjetoFormModal } from '../../../../components/projetos/ProjetoFormModal';

export default function ProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const podeEditar = usePermissao('PROJETOS_WRITE');
  const podeVerValor = usePermissao('FINANCEIRO_READ');

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
    return (
      <EstadoErro
        oQue="o projeto"
        detalhe={erro}
        onTentarDeNovo={() => {
          setErro(null);
          carregar();
        }}
      />
    );
  }

  if (!projeto) {
    return <div className="h-40 animate-pulse rounded-card bg-white/60" />;
  }

  const proximo = proximoEstagio(projeto.estagio);
  const valor = projeto.valor
    ? Number(projeto.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Sem valor definido';

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
                {formatarDataCivil(projeto.dataLimiteCompliance)}
              </span>
            )}
          </div>
        </div>
        {/* Valor só para quem tem FINANCEIRO_READ. A API já não manda o número
            para os demais; isto aqui é o acabamento, para não sobrar um bloco
            vazio escrito "Valor" na tela de quem não pode ver. */}
        {podeVerValor && (
          <div className="ml-auto text-right">
            <p className="text-xs font-light uppercase tracking-wide text-ink/60">Valor</p>
            <p className="dado mt-2 text-lg font-semibold leading-none text-ink">{valor}</p>
          </div>
        )}
      </div>

      {/* Estágio do projeto como trilha clicável. A descrição embaixo não é
          enfeite: sem ela os quatro nomes não querem dizer nada, e o efeito de
          marcar Concluído (parar de alertar) acontecia sem ninguém saber. */}
      <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">Estágio</p>
          <span className="dado text-xs text-ink/45">
            {ESTAGIOS_PROJETO.indexOf(projeto.estagio) + 1} de {ESTAGIOS_PROJETO.length}
          </span>
        </div>
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

        <p className="mt-3 text-xs leading-relaxed text-ink/55">
          {ESTAGIO_PROJETO_DESCRICAO[projeto.estagio]}
        </p>

        {podeEditar && proximo && (
          <Button variante="secondary" className="mt-3" onClick={() => mudarEstagio(proximo)}>
            Avançar para {ESTAGIO_PROJETO_LABEL[proximo]}
          </Button>
        )}
      </div>

      {/* Descrição sempre visível para quem edita, mesmo vazia: antes o bloco
          sumia quando não havia texto, e com ele sumia o caminho para escrever
          o primeiro. Quem só lê continua não vendo bloco vazio. */}
      {(projeto.descricao || podeEditar) && (
        <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-xs font-light uppercase tracking-wide text-ink/60">Descrição</p>
            {podeEditar && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="text-xs text-ink/50 underline-offset-2 transition-colors hover:text-brand hover:underline"
              >
                {projeto.descricao ? 'Editar' : 'Escrever'}
              </button>
            )}
          </div>
          {projeto.descricao ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {projeto.descricao}
            </p>
          ) : (
            <p className="text-sm text-ink/40">
              Sem descrição. Escreva o que este projeto entrega, para quem pegar depois entender
              sem perguntar.
            </p>
          )}
        </div>
      )}

      {/* Quem toca o projeto. Uma pessoa é responsável; duas ou mais são a
          equipe, e o título muda junto para a palavra não mentir. */}
      {(projeto.equipe?.length ?? 0) > 0 && (
        <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-xs font-light uppercase tracking-wide text-ink/60">
              {(projeto.equipe?.length ?? 0) > 1 ? 'Equipe' : 'Responsável'}
            </p>
            <span className="dado text-xs text-ink/45">
              {projeto.equipe?.length}{' '}
              {(projeto.equipe?.length ?? 0) > 1 ? 'pessoas' : 'pessoa'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {projeto.equipe?.map((pessoa) => (
              <span
                key={pessoa.id}
                className="rounded-full bg-surface px-3 py-1 text-sm text-ink/75"
                title={pessoa.especialidade ?? undefined}
              >
                {pessoa.nome}
              </span>
            ))}
          </div>
        </div>
      )}

      <EtapasSection projetoId={id} etapas={projeto.etapas ?? []} onMudou={carregar} />

      {/* Histórico deste projeto, separado do da empresa: quando o prazo
          aperta, a conversa que interessa é a do projeto. */}
      <Timeline projetoId={id} vazio="Nenhum contato registrado neste projeto ainda." />

      <ProjetoFormModal
        key={projeto.id}
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
