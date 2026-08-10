'use client';

import { useEffect, useState } from 'react';
import { api, statusDoErro } from '../../../lib/api';
import { usePermissao } from '../../../hooks/useSessao';
import { Competencia } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { EstadoErro } from '../../../components/ui/EstadoErro';
import { CompetenciaFormModal } from '../../../components/competencias/CompetenciaFormModal';

export default function CompetenciasPage() {
  const [competencias, setCompetencias] = useState<Competencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O status vem junto do texto: é ele que separa "seu cargo não tem acesso"
  // de "deu erro, tente de novo". Ver EstadoErro.
  const [statusErro, setStatusErro] = useState<number | undefined>(undefined);
  const [modal, setModal] = useState<{ aberto: boolean; competencia: Competencia | null }>({
    aberto: false,
    competencia: null,
  });
  const podeEscrever = usePermissao('COMPETENCIAS_WRITE');

  function carregar() {
    api
      .getTodos<Competencia>('/competencias')
      .then(setCompetencias)
      .catch((e: Error) => {
        setErro(e.message);
        setStatusErro(statusDoErro(e));
      });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function excluir(competencia: Competencia) {
    if (!window.confirm(`Excluir a competência ${competencia.nome}?`)) return;
    setErro(null);
    try {
      await api.del(`/competencias/${competencia.id}`);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a competência');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="titulo-pagina">Competências</h1>
        {podeEscrever && (
          <Button onClick={() => setModal({ aberto: true, competencia: null })}>
            Nova competência
          </Button>
        )}
      </div>

      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink/55">
        Especialidades que um consultor pode ter. Aparecem como opção de marcação na tela de
        Membros, ao cadastrar ou editar quem faz visita técnica.
      </p>

      {/* Erro de ação (excluir que falhou) com a lista já na tela: aviso curto.
          Erro de carga é outra coisa e vira o bloco de EstadoErro abaixo. */}
      {erro && competencias && (
        <p role="alert" className="mb-3 text-xs text-accent">
          {erro}
        </p>
      )}

      {erro && !competencias ? (
        <EstadoErro
          oQue="as competências"
          detalhe={erro}
          status={statusErro}
          onTentarDeNovo={() => {
            setErro(null);
            carregar();
          }}
        />
      ) : !competencias ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-white/60" />
          ))}
        </div>
      ) : competencias.length === 0 ? (
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink/50">Nenhuma competência cadastrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {competencias.map((competencia) => (
            <div
              key={competencia.id}
              className="flex items-start justify-between gap-3 rounded-card border border-ink/10 bg-white p-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="font-semibold leading-tight text-ink">{competencia.nome}</p>
                {competencia.descricao && (
                  <p className="mt-1 text-xs text-ink/55">{competencia.descricao}</p>
                )}
              </div>
              {podeEscrever && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variante="ghost"
                    onClick={() => setModal({ aberto: true, competencia })}
                  >
                    Editar
                  </Button>
                  <Button variante="ghost" onClick={() => excluir(competencia)}>
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CompetenciaFormModal
        aberto={modal.aberto}
        competencia={modal.competencia}
        onFechar={() => setModal({ aberto: false, competencia: null })}
        onMudou={() => {
          setModal({ aberto: false, competencia: null });
          carregar();
        }}
      />
    </div>
  );
}
