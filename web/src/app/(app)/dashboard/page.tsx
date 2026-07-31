'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { DashboardResumo } from '../../../types';
import {
  ESTAGIOS_PROJETO,
  ESTAGIO_PROJETO_LABEL,
  formatarData,
} from '../../../lib/formato';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { BarraRanking } from '../../../components/dashboard/BarraRanking';
import { SeloPrazo } from '../../../components/projetos/SeloPrazo';

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export default function DashboardPage() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardResumo>('/dashboard/resumo')
      .then(setResumo)
      .catch((error: Error) => setErro(error.message));
  }, []);

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

  const totalProjetos = resumo.projetosPorEstagio.reduce((s, p) => s + p.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="titulo-pagina">Dashboard</h1>

      {/* Grade densa de KPIs — cada card é um botão que leva ao detalhe.
          2 colunas no mobile, 4 a partir do desktop. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Projetos em execução"
          valor={resumo.projetosEmExecucao}
          href="/projetos"
          nota={`${totalProjetos} no total`}
        />
        <KpiCard
          label="Concluídos"
          valor={resumo.projetosConcluidos}
          href="/projetos"
          nota={`${resumo.concluidosNoMes} este mês`}
        />
        <KpiCard
          label="Valor em execução"
          valor={moeda(resumo.valorEmExecucao)}
          href="/projetos"
          nota="Projetos não concluídos"
        />
        <KpiCard
          label="Marcos vencendo"
          valor={resumo.etapasVencendo7Dias}
          href="/projetos"
          nota="Próximos 7 dias"
          alerta={resumo.etapasVencendo7Dias > 0}
        />
        <KpiCard
          label="Alertas não lidos"
          valor={resumo.alertasNaoLidos}
          href="/projetos"
          nota="Compliance"
          alerta={resumo.alertasNaoLidos > 0}
        />
        <KpiCard
          label="Projetos sem prazo"
          valor={resumo.projetosSemPrazo}
          href="/projetos"
          nota="Não geram alerta"
          alerta={resumo.projetosSemPrazo > 0}
        />
        <KpiCard
          label="Tickets abertos"
          valor={resumo.ticketsAbertos}
          href="/empresas"
          nota={resumo.ticketsEmAtraso > 0 ? `${resumo.ticketsEmAtraso} em atraso` : 'Em dia'}
          alerta={resumo.ticketsEmAtraso > 0}
        />
        <KpiCard
          label="Visitas na semana"
          valor={resumo.visitasProximos7Dias}
          href="/agenda"
          nota="Próximos 7 dias"
        />
      </div>

      {/* Rankings: onde estão os projetos e como está a carga do time */}
      <div className="grid gap-3 lg:grid-cols-2">
        <BarraRanking
          titulo="Concentração por empresa"
          vazio="Nenhum projeto ativo ainda."
          itens={resumo.concentracao.map((c) => ({
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
          itens={resumo.cargaConsultores.map((c) => ({
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
            valor: resumo.projetosPorEstagio.find((p) => p.estagio === estagio)?.total ?? 0,
          }))}
        />

        {/* Marcos da semana: lista clicável, não número */}
        <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <p className="text-[11px] font-light uppercase tracking-wide text-ink/55">
            Marcos desta semana
          </p>
          {resumo.marcosDaSemana.length === 0 ? (
            <p className="mt-4 text-xs text-ink/35">Nenhum marco vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {resumo.marcosDaSemana.map((marco) => (
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
                        {formatarData(marco.prazo)}
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
