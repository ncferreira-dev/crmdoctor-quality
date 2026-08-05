'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import {
  ConsultorDaVisita,
  EmpresaCliente,
  Projeto,
  StatusVisita,
  Tarefa,
  Visita,
} from '../../types';
import { STATUS_VISITA_LABEL, capitalizarPrimeira } from '../../lib/formato';
import { Button } from '../ui/Button';
import { EstadoErro } from '../ui/EstadoErro';
import { Select } from '../ui/Select';
import { ChevronLeft, ChevronRight, FiltroIcon, Plus, SearchIcon } from '../ui/icons';
import { agruparPorDia, intervaloDaVisao } from './agendaUtils';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { ListView } from './ListView';
import { VisitaFormModal } from './VisitaFormModal';

type View = 'mes' | 'semana' | 'dia' | 'lista';

const VIEWS: { valor: View; label: string }[] = [
  { valor: 'mes', label: 'Mês' },
  { valor: 'semana', label: 'Semana' },
  { valor: 'dia', label: 'Dia' },
  { valor: 'lista', label: 'Lista' },
];

const STATUS = Object.keys(STATUS_VISITA_LABEL) as StatusVisita[];

// Maiúscula só na primeira letra, aqui e não no CSS: `capitalize` maiusculiza
// cada palavra e escrevia "Agosto De 2026" e "Terça-Feira, 04 De Agosto".
function titulo(view: View, refDate: Date): string {
  if (view === 'mes') {
    return capitalizarPrimeira(
      refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    );
  }
  if (view === 'dia') {
    return capitalizarPrimeira(
      refDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    );
  }
  if (view === 'semana') {
    // O mês abreviado do pt-BR vem com ponto ("4 de ago."), que numa frase
    // curta de cabeçalho só polui.
    const dia = refDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `Semana de ${dia.replace('.', '')}`;
  }
  return 'Próximas visitas';
}

export function AgendaCalendar() {
  const [view, setView] = useState<View>('mes');
  const [refDate, setRefDate] = useState(new Date());
  const [visitas, setVisitas] = useState<Visita[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [consultores, setConsultores] = useState<Pick<ConsultorDaVisita, 'id' | 'nome'>[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  // Fechado por padrão no celular. No desktop o `sm:flex` ignora este estado.
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const [modal, setModal] = useState<{ aberto: boolean; visita: Visita | null; inicio?: string }>({
    aberto: false,
    visita: null,
  });
  const podeEditar = usePermissao('VISITAS_WRITE');

  function carregar() {
    const { de, ate } = intervaloDaVisao(view, refDate);
    // Sem reset para null: ao trocar de mês, os dados anteriores seguem na tela
    // até os novos chegarem (~200ms). Evita o piscar do esqueleto a cada
    // navegação — e mantém o setState fora do corpo síncrono do effect.
    api
      .getTodos<Visita>(`/visitas?de=${de}&ate=${ate}`)
      .then(setVisitas)
      .catch((e: Error) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, refDate]);

  useEffect(() => {
    api
      .get<Pick<ConsultorDaVisita, 'id' | 'nome'>[]>('/visitas/consultores')
      .then(setConsultores)
      .catch(() => {});
    api.getTodos<EmpresaCliente>('/empresas').then(setEmpresas).catch(() => {});
    // A mesma lista serve para duas coisas: o seletor de projeto do formulário
    // e as marcas de prazo no calendário. Carregada uma vez, não a cada mês.
    api
      .getTodos<Projeto>('/projetos')
      .then(setProjetos)
      .catch(() => {});
    // Tarefa entra na agenda porque é trabalho com data, e sem ela o calendário
    // de uma consultoria fica quase vazio: visita é o que acontece em campo, e
    // a maior parte do trabalho não é em campo. Falha em silêncio de propósito:
    // quem não tem TAREFAS_READ recebe 403 e a agenda segue mostrando o resto.
    api
      .getTodos<Tarefa>('/tarefas')
      .then(setTarefas)
      .catch(() => setTarefas([]));
  }, []);

  // Prazo de compliance por dia. É informação diferente de visita: ninguém
  // "comparece" a um prazo, ele só vence. Por isso vai num mapa separado, com
  // desenho separado, em vez de virar mais um bloco na grade.
  const prazosPorDia = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapa = new Map<string, Projeto[]>();

    // Os filtros valem para o prazo também, senão a agenda continua mostrando
    // compromisso de empresa que a pessoa acabou de tirar da tela, e o filtro
    // passa a parecer quebrado. Foi medido: filtrando por uma empresa, as
    // visitas caíam de 7 para 2 e as três marcas de prazo continuavam lá,
    // inclusive de outras duas empresas.
    //
    // Consultor e status são filtros que um prazo não tem como responder:
    // ninguém é responsável por uma data vencer, e prazo não fica "confirmado"
    // nem "cancelado". Quando um deles está ativo, a pessoa pediu uma lista de
    // visitas, então o prazo sai de cena em vez de fingir que se encaixa.
    if (filtroConsultor || filtroStatus) return mapa;

    for (const projeto of projetos) {
      if (!projeto.dataLimiteCompliance || projeto.estagio === 'CONCLUIDO') continue;
      if (filtroEmpresa && projeto.empresaId !== filtroEmpresa) continue;
      if (termo) {
        const alvo = `${projeto.titulo} ${projeto.empresa?.nome ?? ''}`.toLowerCase();
        if (!alvo.includes(termo)) continue;
      }
      // Data civil (@db.Date): fatiar a string evita o fuso jogar o prazo para
      // o dia anterior, que é o bug que a tela já teve com esses campos.
      const chave = projeto.dataLimiteCompliance.slice(0, 10);
      mapa.set(chave, [...(mapa.get(chave) ?? []), projeto]);
    }
    return mapa;
  }, [projetos, filtroEmpresa, filtroConsultor, filtroStatus, busca]);

  const tarefasPorDia = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapa = new Map<string, Tarefa[]>();

    // Tarefa não tem empresa nem status de visita, então os filtros que ela não
    // sabe responder a tiram de cena, pelo mesmo critério já usado no prazo.
    // Consultor ela responde: é o responsável.
    if (filtroEmpresa || filtroStatus) return mapa;

    for (const tarefa of tarefas) {
      if (!tarefa.prazo || tarefa.status === 'CONCLUIDA') continue;
      if (filtroConsultor && tarefa.responsavelId !== filtroConsultor) continue;
      if (termo) {
        const alvo = `${tarefa.titulo} ${tarefa.responsavel?.nome ?? ''}`.toLowerCase();
        if (!alvo.includes(termo)) continue;
      }
      // Campo @db.Date: fatiar a string evita o fuso empurrar para o dia
      // anterior, mesmo motivo do prazo de compliance.
      const chave = tarefa.prazo.slice(0, 10);
      mapa.set(chave, [...(mapa.get(chave) ?? []), tarefa]);
    }
    return mapa;
  }, [tarefas, filtroEmpresa, filtroStatus, filtroConsultor, busca]);

  // O contador existe para o filtro não ficar escondido e esquecido: com o
  // painel fechado, nada na tela diria que a agenda está mostrando um recorte.
  const filtrosAtivos = [filtroConsultor, filtroEmpresa, filtroStatus, busca.trim()].filter(
    Boolean,
  ).length;

  const visitasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (visitas ?? []).filter((v) => {
      if (filtroConsultor && v.consultorId !== filtroConsultor) return false;
      if (filtroEmpresa && v.empresaId !== filtroEmpresa) return false;
      if (filtroStatus && v.status !== filtroStatus) return false;
      if (termo) {
        const alvo = `${v.empresa?.nome ?? ''} ${v.consultor?.nome ?? ''} ${v.tipoServico} ${v.observacoes ?? ''}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [visitas, filtroConsultor, filtroEmpresa, filtroStatus, busca]);

  const visitasPorDia = useMemo(() => agruparPorDia(visitasFiltradas), [visitasFiltradas]);

  // Tipos de serviço já cadastrados, para o formulário sugerir em vez de deixar
  // cada pessoa escrever a própria versão. Sai da lista carregada, sem consulta
  // extra: o campo continua livre, só deixa de partir do zero toda vez.
  const tiposDeServico = useMemo(() => {
    const usados = new Set((visitas ?? []).map((v) => v.tipoServico.trim()).filter(Boolean));
    return [...usados].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [visitas]);

  function navegar(direcao: -1 | 1) {
    setRefDate((atual) => {
      const nova = new Date(atual);
      if (view === 'mes') nova.setMonth(atual.getMonth() + direcao);
      else if (view === 'semana') nova.setDate(atual.getDate() + 7 * direcao);
      else nova.setDate(atual.getDate() + direcao);
      return nova;
    });
  }

  function abrirNovo(dia?: Date) {
    if (!podeEditar) return;
    const base = dia ?? new Date();
    base.setHours(9, 0, 0, 0);
    const ajustado = new Date(base.getTime() - base.getTimezoneOffset() * 60000);
    setModal({ aberto: true, visita: null, inicio: ajustado.toISOString().slice(0, 16) });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho: título + navegação + troca de visão + novo */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="titulo-pagina">{titulo(view, refDate)}</h1>
          {view !== 'lista' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navegar(-1)}
                className="rounded-md border border-ink/15 p-1.5 text-ink/70 hover:bg-surface"
                aria-label="Anterior"
              >
                <ChevronLeft />
              </button>
              <Button variante="secondary" onClick={() => setRefDate(new Date())}>
                Hoje
              </Button>
              <button
                type="button"
                onClick={() => navegar(1)}
                className="rounded-md border border-ink/15 p-1.5 text-ink/70 hover:bg-surface"
                aria-label="Próximo"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </div>

        {/* flex-wrap: no celular as quatro visões mais o botão não cabem numa
            linha só, e sem quebrar o botão saía cortado pela borda da tela. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-ink/15 p-1">
            {VIEWS.map((v) => (
              <button
                key={v.valor}
                type="button"
                onClick={() => setView(v.valor)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  view === v.valor ? 'bg-brand text-white' : 'text-ink/60 hover:bg-surface'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {podeEditar && (
            // "Evento" e não "Nova visita": a agenda passou a mostrar prazo de
            // projeto junto com visita, e o botão nomeia o que a tela comporta.
            <Button onClick={() => abrirNovo()}>
              <Plus />
              Evento
            </Button>
          )}
        </div>
      </div>

      {/* Busca + filtros.
          No celular eles ficam atrás do botão "Filtros": empilhados, a busca
          mais os três seletores tomavam quatro linhas inteiras e empurravam o
          calendário para fora da primeira tela, e o calendário é o motivo de a
          pessoa ter aberto a agenda. No desktop sobra largura, então continuam
          sempre à vista e o botão nem aparece. */}
      <button
        type="button"
        onClick={() => setFiltrosAbertos((v) => !v)}
        aria-expanded={filtrosAbertos}
        aria-controls="filtros-agenda"
        className="flex items-center gap-2 self-start rounded-md border border-ink/15 px-3 py-2 text-sm text-ink/70 transition-colors hover:border-brand/40 sm:hidden"
      >
        <FiltroIcon />
        Filtros
        {filtrosAtivos > 0 && (
          <span className="dado inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] leading-none text-white">
            {filtrosAtivos}
          </span>
        )}
      </button>

      <div
        id="filtros-agenda"
        className={`${filtrosAbertos ? 'flex' : 'hidden'} flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center`}
      >
        <div className="relative sm:max-w-xs sm:flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
            <SearchIcon />
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            // "eventos" e não "visitas" porque a busca agora alcança as duas
            // coisas que a agenda mostra: a visita e o prazo de compliance.
            placeholder="Buscar eventos"
            aria-label="Buscar eventos na agenda"
            className="w-full rounded-md border border-ink/15 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        {/* Os três filtros usam o Select do design system, e não <select> cru:
            antes tinham borda e foco próprios, montados na mão, que já
            divergiam do resto do sistema. */}
        <Select
          id="filtro-consultor"
          aria-label="Filtrar por consultor"
          value={filtroConsultor}
          onChange={(e) => setFiltroConsultor(e.target.value)}
        >
          <option value="">Todos os consultores</option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Select
          id="filtro-empresa"
          aria-label="Filtrar por empresa"
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
        >
          <option value="">Todas as empresas</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.nome}
            </option>
          ))}
        </Select>
        <Select
          id="filtro-status"
          aria-label="Filtrar por status"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_VISITA_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {/* Conteúdo */}
      {erro ? (
        <EstadoErro
          oQue="a agenda"
          detalhe={erro}
          onTentarDeNovo={() => {
            setErro(null);
            carregar();
          }}
        />
      ) : !visitas ? (
        <div className="h-96 animate-pulse rounded-card bg-surface" />
      ) : view === 'mes' ? (
        <MonthView
          refDate={refDate}
          visitasPorDia={visitasPorDia}
          prazosPorDia={prazosPorDia}
          tarefasPorDia={tarefasPorDia}
          onSelecionarVisita={(v) => setModal({ aberto: true, visita: v })}
          onSelecionarDia={abrirNovo}
        />
      ) : view === 'semana' ? (
        <WeekView
          refDate={refDate}
          visitasPorDia={visitasPorDia}
          onSelecionarVisita={(v) => setModal({ aberto: true, visita: v })}
          onSelecionarDia={abrirNovo}
        />
      ) : view === 'dia' ? (
        <DayView
          refDate={refDate}
          visitasPorDia={visitasPorDia}
          onSelecionarVisita={(v) => setModal({ aberto: true, visita: v })}
        />
      ) : (
        <ListView visitas={visitasFiltradas} onSelecionarVisita={(v) => setModal({ aberto: true, visita: v })} />
      )}

      <VisitaFormModal
        // Remonta a cada abertura: é o que faz o formulário nascer com a visita
        // certa (ou vazio, no caso de uma nova) sem precisar de effect de
        // sincronia lá dentro.
        key={`${modal.visita?.id ?? 'novo'}-${modal.inicio ?? ''}`}
        aberto={modal.aberto}
        visita={modal.visita}
        inicioSugerido={modal.inicio}
        projetos={projetos}
        tiposDeServico={tiposDeServico}
        onFechar={() => setModal({ aberto: false, visita: null })}
        onMudou={() => {
          setModal({ aberto: false, visita: null });
          carregar();
        }}
      />
    </div>
  );
}
