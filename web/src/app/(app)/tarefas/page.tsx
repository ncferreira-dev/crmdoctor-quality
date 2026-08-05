'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { diasAteOPrazo } from '../../../lib/formato';
import { usePermissao, useSessaoUsuario } from '../../../hooks/useSessao';
import { StatusTarefa, Tarefa } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { EstadoErro } from '../../../components/ui/EstadoErro';
import { ItemTarefa } from '../../../components/tarefas/ItemTarefa';
import { TarefaFormModal } from '../../../components/membros/TarefaFormModal';

type Escopo = 'minhas' | 'equipe';

// A tela responde "o que eu preciso fazer", e a resposta muda conforme o prazo.
// Por isso os grupos são por urgência, e não por status: uma tarefa atrasada e
// uma para semana que vem estão as duas "pendentes", mas não cobram a mesma
// coisa de quem abre a tela de manhã.
interface Grupo {
  chave: string;
  titulo: string;
  tarefas: Tarefa[];
  destaque?: boolean;
}

function agrupar(tarefas: Tarefa[]): Grupo[] {
  const abertas = tarefas.filter((t) => t.status !== 'CONCLUIDA');
  const concluidas = tarefas.filter((t) => t.status === 'CONCLUIDA');

  const atrasadas: Tarefa[] = [];
  const hoje: Tarefa[] = [];
  const proximas: Tarefa[] = [];
  const semPrazo: Tarefa[] = [];

  for (const tarefa of abertas) {
    if (!tarefa.prazo) {
      semPrazo.push(tarefa);
      continue;
    }
    const dias = diasAteOPrazo(tarefa.prazo);
    if (dias < 0) atrasadas.push(tarefa);
    else if (dias === 0) hoje.push(tarefa);
    else proximas.push(tarefa);
  }

  return [
    { chave: 'atrasadas', titulo: 'Atrasadas', tarefas: atrasadas, destaque: true },
    { chave: 'hoje', titulo: 'Para hoje', tarefas: hoje },
    { chave: 'proximas', titulo: 'A caminho', tarefas: proximas },
    { chave: 'sem-prazo', titulo: 'Sem prazo', tarefas: semPrazo },
    { chave: 'concluidas', titulo: 'Concluídas', tarefas: concluidas },
  ].filter((grupo) => grupo.tarefas.length > 0);
}

export default function TarefasPage() {
  const usuario = useSessaoUsuario();
  const podeVer = usePermissao('TAREFAS_READ');
  const podeMexer = usePermissao('TAREFAS_WRITE');
  const podeVerEquipe = usePermissao('USUARIOS_READ');

  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null);
  const [escopo, setEscopo] = useState<Escopo>('minhas');
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(() => {
    // Sem a permissão nem chega a chamar: a API responderia 403 e a tela
    // exibiria "Permissão necessária: TAREFAS_READ", que é jargão de backend.
    // O menu já esconde este item, mas dá para chegar aqui por link salvo.
    if (!usuario || !podeVer) return;
    // Na visão "minhas" o filtro vai na API, não no cliente: sem isso a página
    // baixaria a lista da empresa inteira para jogar quase tudo fora.
    const filtro = escopo === 'minhas' ? `?responsavelId=${usuario.id}` : '';
    api
      .getTodos<Tarefa>(`/tarefas${filtro}`)
      .then((lista) => {
        setTarefas(lista);
        setErro(null);
      })
      .catch((e: Error) => setErro(e.message));
  }, [escopo, usuario, podeVer]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function mudarStatus(tarefa: Tarefa, status: StatusTarefa) {
    const anterior = tarefas;
    // Otimista: a marcação responde no clique. Se a API recusar, volta ao que
    // era e diz o motivo, em vez de deixar a tela afirmando o que não é.
    setTarefas((atual) =>
      (atual ?? []).map((t) => (t.id === tarefa.id ? { ...t, status } : t)),
    );
    try {
      await api.patch(`/tarefas/${tarefa.id}`, { status });
    } catch (e) {
      setTarefas(anterior);
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar o status da tarefa');
    }
  }

  const grupos = agrupar(tarefas ?? []);
  const abertas = (tarefas ?? []).filter((t) => t.status !== 'CONCLUIDA').length;

  if (!podeVer) {
    return (
      <div>
        <h1 className="titulo-pagina mb-4">Minhas tarefas</h1>
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink">O seu cargo não recebe tarefas pelo sistema.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/45">
            Se você deveria receber, peça a quem administra o sistema para liberar tarefas para o
            seu cargo, na tela de Cargos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="titulo-pagina">
            {escopo === 'minhas' ? 'Minhas tarefas' : 'Tarefas da equipe'}
          </h1>
          {tarefas && (
            <span className="dado text-sm text-ink/45">
              {abertas === 0 ? 'nada em aberto' : `${abertas} em aberto`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {podeVerEquipe && (
            <div className="flex items-center gap-1 rounded-lg border border-ink/15 p-1">
              {(
                [
                  { valor: 'minhas', label: 'Minhas' },
                  { valor: 'equipe', label: 'Da equipe' },
                ] as const
              ).map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setEscopo(opcao.valor)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    escopo === opcao.valor
                      ? 'bg-brand text-white'
                      : 'text-ink/60 hover:bg-surface'
                  }`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          )}
          {podeMexer && <Button onClick={() => setModalAberto(true)}>Nova tarefa</Button>}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mb-3 text-xs text-accent">
          {erro}
        </p>
      )}

      {!tarefas ? (
        // Esqueleto só enquanto está mesmo carregando. Se a chamada falhou, o
        // lugar de dizer isso é o bloco de erro com botão de tentar de novo, e
        // não um esqueleto pulsando para sempre.
        erro ? (
          <EstadoErro
            oQue="as suas tarefas"
            detalhe={erro}
            onTentarDeNovo={() => {
              setErro(null);
              carregar();
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-card bg-white/60" />
            ))}
          </div>
        )
      ) : grupos.length === 0 ? (
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink/60">
            {escopo === 'minhas'
              ? 'Você não tem nenhuma tarefa no momento.'
              : 'A equipe não tem nenhuma tarefa no momento.'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/45">
            Tarefa é trabalho solto do dia a dia, tipo ligar para uma clínica ou revisar um
            contrato. Marco de compliance com prazo formal vive dentro do projeto.
          </p>
          {podeMexer && (
            <Button className="mt-4" onClick={() => setModalAberto(true)}>
              Criar a primeira
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((grupo) => (
            <section
              key={grupo.chave}
              className="rounded-card border border-ink/10 bg-white px-5 py-4 shadow-card"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  className={`text-xs font-light uppercase tracking-wide ${
                    grupo.destaque ? 'text-accent' : 'text-ink/50'
                  }`}
                >
                  {grupo.titulo}
                </h2>
                <span className="dado text-xs text-ink/45">{grupo.tarefas.length}</span>
              </div>
              <ul className="mt-1 flex flex-col divide-y divide-ink/10">
                {grupo.tarefas.map((tarefa) => (
                  <ItemTarefa
                    key={tarefa.id}
                    tarefa={tarefa}
                    podeMexer={podeMexer}
                    mostrarResponsavel={escopo === 'equipe'}
                    onMudarStatus={mudarStatus}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Mesmo modal da tela de Membros, com o responsável fixado em mim: aqui
          a tarefa é minha, não é atribuição a outra pessoa. */}
      <TarefaFormModal
        aberto={modalAberto}
        membro={usuario}
        tituloProprio="Nova tarefa"
        onFechar={() => setModalAberto(false)}
        onMudou={() => {
          setModalAberto(false);
          carregar();
        }}
      />
    </div>
  );
}
