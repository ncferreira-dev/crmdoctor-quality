'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { EmpresaCliente, Projeto, ResultadoPaginado } from '../../../../types';
import { SEGMENTO_LABEL, formatarDataHora } from '../../../../lib/formato';
import { Badge } from '../../../../components/ui/Badge';
import { TicketsSection } from '../../../../components/empresas/TicketsSection';

const ESTAGIO_PROJETO_LABEL: Record<string, string> = {
  DIAGNOSTICO: 'Diagnóstico',
  PROPOSTA: 'Proposta',
  EXECUCAO: 'Execução',
  CONCLUIDO: 'Concluído',
};

export default function EmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [empresa, setEmpresa] = useState<EmpresaCliente | null>(null);
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<EmpresaCliente>(`/empresas/${id}`).then(setEmpresa).catch((e: Error) => setErro(e.message));
    api
      .get<ResultadoPaginado<Projeto>>(`/projetos?empresaId=${id}`)
      .then((r) => setProjetos(r.data))
      .catch(() => setProjetos([]));
  }, [id]);

  if (erro) {
    return <p className="text-sm text-ink/60">Não foi possível carregar a empresa: {erro}</p>;
  }

  if (!empresa) {
    return <div className="h-40 animate-pulse rounded-card bg-surface" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/empresas" className="text-xs uppercase tracking-wide text-ink/50 hover:text-brand">
          ← Empresas
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="font-black leading-none text-ink">{empresa.nome}</h1>
          <Badge tom="destaque">{SEGMENTO_LABEL[empresa.segmento]}</Badge>
        </div>
      </div>

      {/* Cabeçalho com contato e contadores */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-card border border-ink/10 bg-white p-4 shadow-card">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">Contato</p>
          <p className="mt-2 font-black leading-none text-ink">{empresa.contatoNome ?? '—'}</p>
          <p className="mt-1 text-xs text-ink/60">{empresa.email ?? empresa.telefone ?? ''}</p>
        </div>
        <div className="rounded-card border border-ink/10 bg-white p-4 shadow-card">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">CNPJ</p>
          <p className="mt-2 font-black leading-none text-ink">{empresa.cnpj ?? '—'}</p>
        </div>
        <div className="rounded-card border border-ink/10 bg-white p-4 shadow-card">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">Tickets abertos</p>
          <p className="mt-2 text-3xl font-black leading-none text-ink">
            {empresa._count?.ticketsAbertos ?? 0}
          </p>
        </div>
        <div className="rounded-card border border-ink/10 bg-white p-4 shadow-card">
          <p className="text-xs font-light uppercase tracking-wide text-ink/60">Próxima visita</p>
          <p className="mt-2 font-black leading-none text-ink">
            {empresa.proximaVisita ? formatarDataHora(empresa.proximaVisita.inicio) : '—'}
          </p>
        </div>
      </div>

      {/* Projetos */}
      <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
        <p className="mb-4 text-xs font-light uppercase tracking-wide text-ink/60">Projetos</p>
        {!projetos ? (
          <div className="h-12 animate-pulse rounded-card bg-surface" />
        ) : projetos.length === 0 ? (
          <p className="text-xs text-ink/40">Nenhum projeto para esta empresa.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {projetos.map((projeto) => (
              <div
                key={projeto.id}
                className="flex items-center justify-between rounded-md border border-ink/10 p-3"
              >
                <p className="font-black leading-none text-ink">{projeto.titulo}</p>
                <Badge>{ESTAGIO_PROJETO_LABEL[projeto.estagio] ?? projeto.estagio}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tickets */}
      <TicketsSection empresaId={id} />
    </div>
  );
}
