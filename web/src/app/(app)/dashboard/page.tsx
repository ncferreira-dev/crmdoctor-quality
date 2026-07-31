'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { DashboardResumo } from '../../../types';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { ProjetosPorEstagio } from '../../../components/dashboard/ProjetosPorEstagio';

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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const taxaConversao = `${Math.round(resumo.taxaConversao * 100)}%`;

  return (
    <div>
      <h1 className="titulo-pagina mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Leads ativos" valor={resumo.leadsAtivos} />
        <KpiCard label="Taxa de conversão" valor={taxaConversao} />
        <KpiCard label="Projetos em execução" valor={resumo.projetosEmExecucao} />
        <KpiCard label="Tickets abertos" valor={resumo.ticketsAbertos} />
        <KpiCard label="Visitas (7 dias)" valor={resumo.visitasProximos7Dias} />
        <KpiCard label="Tickets em atraso" valor={resumo.ticketsEmAtraso} alerta={resumo.ticketsEmAtraso > 0} />
        <KpiCard label="Etapas vencendo (7 dias)" valor={resumo.etapasVencendo7Dias} alerta={resumo.etapasVencendo7Dias > 0} />
        <KpiCard label="Alertas não lidos" valor={resumo.alertasNaoLidos} alerta={resumo.alertasNaoLidos > 0} />
      </div>

      <div className="mt-4">
        <ProjetosPorEstagio dados={resumo.projetosPorEstagio} />
      </div>
    </div>
  );
}
