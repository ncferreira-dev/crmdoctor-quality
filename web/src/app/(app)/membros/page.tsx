'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { usePermissao, useSessaoUsuario } from '../../../hooks/useSessao';
import { ResultadoPaginado, Tarefa, Usuario } from '../../../types';
import { STATUS_TAREFA_LABEL } from '../../../lib/formato';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SeloPrazo } from '../../../components/projetos/SeloPrazo';
import { MembroFormModal } from '../../../components/membros/MembroFormModal';
import { TarefaFormModal } from '../../../components/membros/TarefaFormModal';

export default function MembrosPage() {
  const [membros, setMembros] = useState<Usuario[] | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalMembro, setModalMembro] = useState<{ aberto: boolean; membro: Usuario | null }>({
    aberto: false,
    membro: null,
  });
  const [modalTarefa, setModalTarefa] = useState<{ aberto: boolean; membro: Usuario | null }>({
    aberto: false,
    membro: null,
  });
  const [codigoReenviado, setCodigoReenviado] = useState<{ id: string; codigo: string } | null>(
    null,
  );
  const podeGerenciar = usePermissao('USUARIOS_MANAGE');
  const eu = useSessaoUsuario();

  function carregar() {
    api
      .get<Usuario[]>('/users')
      .then(setMembros)
      .catch((e: Error) => setErro(e.message));
    api
      .get<ResultadoPaginado<Tarefa>>('/tarefas?limit=100')
      .then((r) => setTarefas(r.data))
      .catch(() => setTarefas([]));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function gerarCodigo(membro: Usuario) {
    // Confirmação só no caso de reset: aqui a ação derruba uma senha que
    // funcionava e tranca a pessoa fora até ela resgatar o código novo. Gerar
    // código pra quem nunca entrou não tira nada de ninguém.
    if (
      !membro.acessoPendente &&
      !window.confirm(
        `Isto vai invalidar a senha atual de ${membro.nome}. Ela só volta a entrar usando o código novo. Continuar?`,
      )
    ) {
      return;
    }

    setErro(null);
    try {
      const r = await api.post<{ codigoConvite: string; ehReset: boolean }>(
        `/users/${membro.id}/reenviar-convite`,
      );
      setCodigoReenviado({ id: membro.id, codigo: r.codigoConvite });
      // Recarrega pra lista refletir que o acesso ficou pendente.
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível gerar novo código');
    }
  }

  // Desativar em vez de excluir: a pessoa é responsável por etapas e tarefas, e
  // apagá-la levaria o histórico junto (o banco recusaria pelos vínculos, aliás).
  // Conta desativada não entra mais; o que ela fez continua registrado.
  async function alternarAtivo(membro: Usuario) {
    const acao = membro.ativo ? 'desativar' : 'reativar';
    if (
      membro.ativo &&
      !window.confirm(`Desativar ${membro.nome}? A pessoa perde o acesso ao sistema.`)
    ) {
      return;
    }

    setErro(null);
    try {
      await api.patch(`/users/${membro.id}`, { ativo: !membro.ativo });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Não foi possível ${acao} o membro`);
    }
  }

  function tarefasDe(membroId: string) {
    return tarefas.filter((t) => t.responsavelId === membroId && t.status !== 'CONCLUIDA');
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="titulo-pagina">Membros</h1>
        {podeGerenciar && (
          <Button onClick={() => setModalMembro({ aberto: true, membro: null })}>
            Novo membro
          </Button>
        )}
      </div>

      {erro && (
        <p role="alert" className="mb-3 text-xs text-accent">
          {erro}
        </p>
      )}

      {!membros ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-white/60" />
          ))}
        </div>
      ) : membros.length === 0 ? (
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink/50">Nenhum membro cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {membros.map((membro) => {
            const abertas = tarefasDe(membro.id);
            const pendenteDeAcesso = membro.acessoPendente;

            return (
              <div
                key={membro.id}
                className="rounded-card border border-ink/10 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold leading-tight text-ink">{membro.nome}</p>
                      <Badge tom="destaque">{membro.cargo?.nome ?? 'Sem cargo'}</Badge>
                      {pendenteDeAcesso && <Badge tom="alerta">Acesso pendente</Badge>}
                      {!membro.ativo && <Badge>Inativo</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-ink/55">
                      {membro.email}
                      {membro.telefone ? ` · ${membro.telefone}` : ''}
                    </p>
                  </div>

                  {podeGerenciar && (
                    <div className="flex flex-wrap gap-2">
                      <Button variante="ghost" onClick={() => gerarCodigo(membro)}>
                        {pendenteDeAcesso ? 'Gerar código' : 'Resetar senha'}
                      </Button>
                      <Button
                        variante="ghost"
                        onClick={() => setModalMembro({ aberto: true, membro })}
                      >
                        Editar
                      </Button>
                      <Button
                        variante="secondary"
                        onClick={() => setModalTarefa({ aberto: true, membro })}
                      >
                        Enviar tarefa
                      </Button>
                      {/* Escondido na própria conta: o backend já recusa (a
                          hierarquia pede nível maior, e ninguém tem nível maior
                          que o próprio), mas oferecer um botão que só dá erro é
                          pior do que não oferecer. */}
                      {membro.id !== eu?.id && (
                        <Button
                          variante={membro.ativo ? 'danger' : 'secondary'}
                          onClick={() => alternarAtivo(membro)}
                        >
                          {membro.ativo ? 'Desativar' : 'Reativar'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {codigoReenviado?.id === membro.id && (
                  <div className="mt-3 rounded-md bg-surface p-3 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-ink/50">
                      Novo código de primeiro acesso
                    </p>
                    <p className="dado mt-1 text-xl font-semibold tracking-[0.2em] text-brand">
                      {codigoReenviado.codigo}
                    </p>
                  </div>
                )}

                {/* Tarefas abertas do membro */}
                {abertas.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5 border-t border-ink/10 pt-3">
                    {abertas.map((tarefa) => (
                      <li
                        key={tarefa.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-ink/80">{tarefa.titulo}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] text-ink/45">
                            {STATUS_TAREFA_LABEL[tarefa.status]}
                          </span>
                          {tarefa.prazo && <SeloPrazo prazo={tarefa.prazo} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MembroFormModal
        aberto={modalMembro.aberto}
        membro={modalMembro.membro}
        onFechar={() => setModalMembro({ aberto: false, membro: null })}
        onMudou={() => {
          setModalMembro({ aberto: false, membro: null });
          carregar();
        }}
      />
      <TarefaFormModal
        aberto={modalTarefa.aberto}
        membro={modalTarefa.membro}
        onFechar={() => setModalTarefa({ aberto: false, membro: null })}
        onMudou={() => {
          setModalTarefa({ aberto: false, membro: null });
          carregar();
        }}
      />
    </div>
  );
}
