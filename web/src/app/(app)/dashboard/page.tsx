'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { usePermissao } from '../../../hooks/useSessao';
import { DashboardResumo, Notificacao } from '../../../types';
import {
  ESTAGIOS_PROJETO,
  ESTAGIO_PROJETO_LABEL,
  formatarDataCivil,
} from '../../../lib/formato';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { BarraRanking } from '../../../components/dashboard/BarraRanking';
import { PainelAlertas } from '../../../components/dashboard/PainelAlertas';

function moeda(valor: number | undefined): string {
  return (valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

// Campo numérico que pode não existir se a API estiver numa versão anterior.
function num(valor: number | undefined): number {
  return valor ?? 0;
}

export default function DashboardPage() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<Notificacao[] | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const podeVerAlertas = usePermissao('NOTIFICACOES_READ');

  useEffect(() => {
    api
      .get<DashboardResumo>('/dashboard/resumo')
      .then(setResumo)
      .catch((error: Error) => setErro(error.message));
  }, []);

  useEffect(() => {
    if (!podeVerAlertas) return;
    api
      .get<Notificacao[]>('/notificacoes?lida=false')
      .then(setAlertas)
      .catch(() => setAlertas([]));
  }, [podeVerAlertas]);

  // Some da lista e desconta do card na hora, sem recarregar o resumo inteiro:
  // o número e a lista são a mesma informação e não podem discordar na tela.
  async function marcarLida(id: string) {
    setMarcando(id);
    try {
      await api.patch(`/notificacoes/${id}/lida`);
      setAlertas((atuais) => (atuais ?? []).filter((a) => a.id !== id));
      setResumo((atual) =>
        atual ? { ...atual, alertasNaoLidos: Math.max(0, num(atual.alertasNaoLidos) - 1) } : atual,
      );
    } catch {
      // Falhou: recarrega a lista do servidor em vez de mentir na tela.
      api
        .get<Notificacao[]>('/notificacoes?lida=false')
        .then(setAlertas)
        .catch(() => {});
    } finally {
      setMarcando(null);
    }
  }

  if (erro) {
    return <p className="text-sm text-ink/60">Não foi possível carregar o dashboard: {erro}</p>;
  }

  if (!resumo) {
    return (
      <div>
        <h1 className="titulo-pagina mb-4">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-white/60" />
          ))}
        </div>
      </div>
    );
  }

  // Defensivo de propósito: se a API estiver numa versão anterior à do front
  // (deploy do backend atrasado), campos novos chegam undefined. Melhor a tela
  // renderizar vazia do que estourar TypeError e não mostrar nada.
  const porEstagio = resumo.projetosPorEstagio ?? [];
  const concentracao = resumo.concentracao ?? [];
  const carga = resumo.cargaConsultores ?? [];
  const marcos = resumo.marcosDaSemana ?? [];
  const totalProjetos = porEstagio.reduce((s, p) => s + p.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="titulo-pagina">Dashboard</h1>

      {/* Grade densa de KPIs — cada card é um botão que leva ao detalhe.
          2 colunas no mobile, 4 a partir do desktop. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Projetos em execução"
          valor={num(resumo.projetosEmExecucao)}
          href="/projetos"
          nota={`${totalProjetos} no total`}
        />
        <KpiCard
          label="Concluídos"
          valor={num(resumo.projetosConcluidos)}
          href="/projetos"
          nota={`${num(resumo.concluidosNoMes)} este mês`}
        />
        <KpiCard
          label="Valor em execução"
          valor={moeda(resumo.valorEmExecucao)}
          href="/projetos"
          nota="Projetos não concluídos"
        />
        <KpiCard
          label="Marcos vencendo"
          valor={num(resumo.etapasVencendo7Dias)}
          href="/projetos"
          nota="Próximos 7 dias"
          alerta={num(resumo.etapasVencendo7Dias) > 0}
        />
        {podeVerAlertas && (
          <KpiCard
            label="Alertas não lidos"
            valor={num(resumo.alertasNaoLidos)}
            // Leva ao painel logo abaixo, onde os alertas estão escritos e é
            // possível dar baixa. Antes apontava para /projetos, que não mostra
            // alerta nenhum.
            href="#alertas"
            nota="Compliance"
            alerta={num(resumo.alertasNaoLidos) > 0}
          />
        )}
        <KpiCard
          label="Projetos sem prazo"
          valor={num(resumo.projetosSemPrazo)}
          href="/projetos"
          nota="Não geram alerta"
          alerta={num(resumo.projetosSemPrazo) > 0}
        />
        <KpiCard
          label="Tickets abertos"
          valor={num(resumo.ticketsAbertos)}
          href="/empresas"
          nota={num(resumo.ticketsEmAtraso) > 0 ? `${num(resumo.ticketsEmAtraso)} em atraso` : 'Em dia'}
          alerta={num(resumo.ticketsEmAtraso) > 0}
        />
        <KpiCard
          label="Visitas na semana"
          valor={num(resumo.visitasProximos7Dias)}
          href="/agenda"
          nota="Próximos 7 dias"
        />
      </div>

      {podeVerAlertas && (
        <PainelAlertas alertas={alertas} onMarcarLida={marcarLida} marcando={marcando} />
      )}

      {/* Rankings: onde estão os projetos e como está a carga do time */}
      <div className="grid gap-3 lg:grid-cols-2">
        <BarraRanking
          titulo="Concentração por empresa"
          vazio="Nenhum projeto ativo ainda."
          itens={concentracao.map((c) => ({
            id: c.empresaId,
            rotulo: c.empresa,
            valor: c.projetos,
            detalhe: `${c.projetos} · ${moeda(c.valor)}`,
            href: `/empresas/${c.empresaId}`,
          }))}
        />
        <BarraRanking
          titulo="Carga por responsável"
          vazio="Nenhum marco atribuído ainda."
          unidade="marcos"
          itens={carga.map((c) => ({
            id: c.usuarioId,
            rotulo: c.nome,
            valor: c.marcosAbertos,
          }))}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Projetos por estágio */}
        <BarraRanking
          titulo="Projetos por estágio"
          vazio="Nenhum projeto cadastrado."
          unidade=""
          itens={ESTAGIOS_PROJETO.map((estagio) => ({
            id: estagio,
            rotulo: ESTAGIO_PROJETO_LABEL[estagio],
            valor: porEstagio.find((p) => p.estagio === estagio)?.total ?? 0,
          }))}
        />

        {/* Marcos da semana: lista clicável, não número */}
        <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <p className="text-[11px] font-light uppercase tracking-wide text-ink/55">
            Marcos desta semana
          </p>
          {marcos.length === 0 ? (
            <p className="mt-4 text-xs text-ink/35">Nenhum marco vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {marcos.map((marco) => (
                <li key={marco.id}>
                  <Link
                    href={`/projetos/${marco.projetoId}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-ink/10 p-2.5 transition-colors hover:border-brand/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{marco.nome}</p>
                      <p className="truncate text-[11px] text-ink/50">{marco.projeto}</p>
                    </div>
                    {marco.prazo && (
                      <span className="dado shrink-0 text-[11px] text-ink/55">
                        {formatarDataCivil(marco.prazo)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
