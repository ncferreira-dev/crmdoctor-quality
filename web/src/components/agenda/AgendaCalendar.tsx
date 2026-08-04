'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import {
  ConsultorDaVisita,
  EmpresaCliente,
  Projeto,
  ResultadoPaginado,
  StatusVisita,
  Visita,
} from '../../types';
import { STATUS_VISITA_LABEL } from '../../lib/formato';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight, Plus, SearchIcon } from '../ui/icons';
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

function titulo(view: View, refDate: Date): string {
  if (view === 'mes') {
    return refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  if (view === 'dia') {
    return refDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  if (view === 'semana') {
    return `Semana de ${refDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
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
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');

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
      .get<ResultadoPaginado<Visita>>(`/visitas?de=${de}&ate=${ate}&limit=100`)
      .then((r) => setVisitas(r.data))
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
    api.get<ResultadoPaginado<EmpresaCliente>>('/empresas?limit=100').then((r) => setEmpresas(r.data)).catch(() => {});
    // A mesma lista serve para duas coisas: o seletor de projeto do formulário
    // e as marcas de prazo no calendário. Carregada uma vez, não a cada mês.
    api
      .get<ResultadoPaginado<Projeto>>('/projetos?limit=100')
      .then((r) => setProjetos(r.data))
      .catch(() => {});
  }, []);

  // Prazo de compliance por dia. É informação diferente de visita: ninguém
  // "comparece" a um prazo, ele só vence. Por isso vai num mapa separado, com
  // desenho separado, em vez de virar mais um bloco na grade.
  const prazosPorDia = useMemo(() => {
    const mapa = new Map<string, Projeto[]>();
    for (const projeto of projetos) {
      if (!projeto.dataLimiteCompliance || projeto.estagio === 'CONCLUIDO') continue;
      // Data civil (@db.Date): fatiar a string evita o fuso jogar o prazo para
      // o dia anterior, que é o bug que a tela já teve com esses campos.
      const chave = projeto.dataLimiteCompliance.slice(0, 10);
      mapa.set(chave, [...(mapa.get(chave) ?? []), projeto]);
    }
    return mapa;
  }, [projetos]);

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
          <h1 className="titulo-pagina capitalize">{titulo(view, refDate)}</h1>
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

        <div className="flex items-center gap-2">
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

      {/* Busca + filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
            <SearchIcon />
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar visitas"
            className="w-full rounded-md border border-ink/15 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <select
          value={filtroConsultor}
          onChange={(e) => setFiltroConsultor(e.target.value)}
          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Todos consultores</option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Todas empresas</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.nome}
            </option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Todos status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_VISITA_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Conteúdo */}
      {erro ? (
        <p className="text-sm text-ink/60">Não foi possível carregar a agenda: {erro}</p>
      ) : !visitas ? (
        <div className="h-96 animate-pulse rounded-card bg-surface" />
      ) : view === 'mes' ? (
        <MonthView
          refDate={refDate}
          visitasPorDia={visitasPorDia}
          prazosPorDia={prazosPorDia}
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
        onFechar={() => setModal({ aberto: false, visita: null })}
        onMudou={() => {
          setModal({ aberto: false, visita: null });
          carregar();
        }}
      />
    </div>
  );
}
