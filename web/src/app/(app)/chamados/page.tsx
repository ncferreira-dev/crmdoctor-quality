'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import {
  VISOES,
  VisaoChamados,
  agruparPorSla,
  caminhoDaBusca,
  contarPorSituacao,
  filtrarPorTexto,
} from '../../../lib/chamados';
import { usePermissao } from '../../../hooks/useSessao';
import { useChamados } from '../../../hooks/useChamados';
import { EmpresaCliente, EmpresaDoTicket, Ticket } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { EstadoErro } from '../../../components/ui/EstadoErro';
import { SearchIcon } from '../../../components/ui/icons';
import { ChamadoItem } from '../../../components/tickets/ChamadoItem';
import { ChamadoFormModal } from '../../../components/tickets/ChamadoFormModal';

// A tela do pós-venda.
//
// Os chamados existiam desde o começo com prazo de resposta por prioridade,
// alerta de SLA vencido no aviso diário e card no dashboard, e a única forma de
// ver um era entrar na empresa certa e rolar até o bloco lá embaixo. Quem
// atende não trabalha por empresa, trabalha por prazo: a pergunta das oito da
// manhã é "o que estourou e o que vai estourar hoje", e ela não tinha tela.

// O que dizer quando a lista volta vazia. Muda por visão de propósito: lista
// vazia em "Em atraso" é boa notícia, e a mesma frase que serve para "Todos"
// ("nenhum chamado ainda") ali seria mentira.
const VAZIO: Record<VisaoChamados, { titulo: string; detalhe: string }> = {
  'em-aberto': {
    titulo: 'Nenhum chamado em aberto.',
    detalhe: 'Tudo que o cliente pediu já foi resolvido.',
  },
  'em-atraso': {
    titulo: 'Nenhum chamado em atraso.',
    detalhe: 'Todo chamado em aberto ainda está dentro do prazo da sua prioridade.',
  },
  resolvidos: {
    titulo: 'Nenhum chamado resolvido ainda.',
    detalhe: 'Chamado resolvido continua aqui, para consulta.',
  },
  todos: {
    titulo: 'Nenhum chamado registrado.',
    detalhe:
      'Chamado é o que o cliente pede depois que o contrato começou: uma dúvida, um desvio, um documento. O prazo de resposta sai da prioridade, e o que estoura vira alerta no aviso diário.',
  },
};

export default function ChamadosPage() {
  const podeVer = usePermissao('TICKETS_READ');
  const podeEditar = usePermissao('TICKETS_WRITE');
  const podeVerEmpresas = usePermissao('EMPRESAS_READ');

  const [visao, setVisao] = useState<VisaoChamados>('em-aberto');
  const [empresaId, setEmpresaId] = useState('');
  const [busca, setBusca] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaDoTicket[]>([]);
  // null = fechado; { ticket: null } = abrindo; { ticket } = editando.
  const [modal, setModal] = useState<{ ticket: Ticket | null } | null>(null);

  const caminho = useMemo(
    () => (podeVer ? caminhoDaBusca(visao, empresaId) : ''),
    [podeVer, visao, empresaId],
  );
  const {
    chamados,
    erro,
    statusErro,
    respondendoId,
    recarregar,
    limparErro,
    registrarResposta,
    mudarStatus,
  } = useChamados(caminho);

  useEffect(() => {
    if (!podeVerEmpresas) return;
    api
      .getTodos<EmpresaCliente>('/empresas')
      .then((lista) => setEmpresas(lista.map(({ id, nome }) => ({ id, nome }))))
      .catch(() => setEmpresas([]));
  }, [podeVerEmpresas]);

  const visiveis = useMemo(() => filtrarPorTexto(chamados ?? [], busca), [chamados, busca]);
  const grupos = useMemo(() => agruparPorSla(visiveis), [visiveis]);
  const contagem = useMemo(() => contarPorSituacao(visiveis), [visiveis]);

  if (!podeVer) {
    return (
      <div>
        <h1 className="titulo-pagina mb-4">Chamados</h1>
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink">O seu cargo não tem acesso aos chamados.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/45">
            Se você precisa atender cliente, peça a quem administra o sistema para liberar chamados
            para o seu cargo, na tela de Cargos.
          </p>
        </div>
      </div>
    );
  }

  const vazio = VAZIO[visao];
  // Só oferece abrir chamado quando existe empresa para escolher. Um botão que
  // abre um formulário com o seletor de empresa vazio é um beco: a pessoa
  // preenche tudo, aperta salvar e leva um erro que não tinha como evitar.
  const podeAbrirChamado = podeEditar && empresas.length > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="titulo-pagina">Chamados</h1>
          {chamados && (
            <span className="dado text-sm text-ink/45">
              {contagem.emAberto === 0
                ? 'nada em aberto'
                : `${contagem.emAberto} em aberto`}
              {contagem.emAtraso > 0 && (
                <span className="text-accent"> · {contagem.emAtraso} em atraso</span>
              )}
            </span>
          )}
        </div>
        {podeAbrirChamado && (
          <Button onClick={() => setModal({ ticket: null })}>Novo chamado</Button>
        )}
      </div>

      {/* Filtros. A visão e a empresa vão para a API; a busca por texto fica no
          navegador, sobre o que já está na tela (ver lib/chamados.ts). */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-ink/15 p-1">
          {VISOES.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setVisao(opcao.valor)}
              aria-pressed={visao === opcao.valor}
              className={`min-h-9 rounded-md px-3 text-sm transition-colors ${
                visao === opcao.valor ? 'bg-brand text-white' : 'text-ink/60 hover:bg-surface'
              }`}
            >
              {opcao.label}
            </button>
          ))}
        </div>

        {empresas.length > 0 && (
          <Select
            id="filtro-empresa"
            aria-label="Filtrar por empresa"
            tamanho="compacto"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </Select>
        )}

        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar chamado"
            placeholder="Buscar chamado"
            className="min-h-9 w-full rounded-md border border-ink/15 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Erro de ação (mudar status, registrar resposta) fica aqui em cima, sem
          derrubar a lista: o que falhou foi um clique, e a lista continua
          válida. Erro de carregamento é outro caso, tratado abaixo. */}
      {erro && chamados && (
        <p role="alert" className="mb-3 text-xs text-accent">
          {erro}
        </p>
      )}

      {!chamados ? (
        erro ? (
          <EstadoErro
            oQue="os chamados"
            detalhe={erro}
            status={statusErro}
            onTentarDeNovo={() => {
              limparErro();
              recarregar();
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-white/60" />
            ))}
          </div>
        )
      ) : grupos.length === 0 ? (
        <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink">{busca.trim() ? 'Nenhum chamado com esse texto.' : vazio.titulo}</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink/45">
            {busca.trim()
              ? 'A busca olha título, descrição e nome da empresa dos chamados desta visão.'
              : vazio.detalhe}
          </p>
          {!busca.trim() && visao === 'todos' && podeAbrirChamado && (
            <Button className="mt-4" onClick={() => setModal({ ticket: null })}>
              Abrir o primeiro
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
                <span className="dado text-xs text-ink/45">{grupo.chamados.length}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/40">{grupo.explicacao}</p>
              <div className="mt-3 flex flex-col gap-2">
                {grupo.chamados.map((ticket) => (
                  <ChamadoItem
                    key={ticket.id}
                    ticket={ticket}
                    podeEditar={podeEditar}
                    mostrarEmpresa
                    registrandoResposta={respondendoId === ticket.id}
                    onEditar={(alvo) => setModal({ ticket: alvo })}
                    onRegistrarResposta={registrarResposta}
                    onMudarStatus={mudarStatus}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ChamadoFormModal
        aberto={modal !== null}
        ticket={modal?.ticket ?? null}
        empresas={empresas}
        onFechar={() => setModal(null)}
        onSalvo={() => {
          setModal(null);
          recarregar();
        }}
      />
    </div>
  );
}
