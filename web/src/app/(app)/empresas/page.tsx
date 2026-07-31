'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { usePermissao } from '../../../hooks/useSessao';
import { EmpresaCliente, ResultadoPaginado } from '../../../types';
import { SEGMENTO_LABEL } from '../../../lib/formato';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { EmpresaFormModal } from '../../../components/empresas/EmpresaFormModal';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<EmpresaCliente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const podeEditar = usePermissao('EMPRESAS_WRITE');

  function carregar(termo: string) {
    const query = termo ? `?busca=${encodeURIComponent(termo)}` : '';
    api
      .get<ResultadoPaginado<EmpresaCliente>>(`/empresas${query}`)
      .then((r) => setEmpresas(r.data))
      .catch((e: Error) => setErro(e.message));
  }

  useEffect(() => {
    carregar('');
  }, []);

  // Busca com debounce simples pra não bater na API a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="titulo-pagina">Empresas</h1>
        {podeEditar && <Button onClick={() => setModalAberto(true)}>Nova empresa</Button>}
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          id="busca"
          placeholder="Buscar por nome ou CNPJ"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erro ? (
        <p className="text-sm text-ink/60">Não foi possível carregar: {erro}</p>
      ) : !empresas ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-ink/40">Nenhuma empresa encontrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {empresas.map((empresa) => (
            <Link
              key={empresa.id}
              href={`/empresas/${empresa.id}`}
              className="flex items-center justify-between rounded-card border border-ink/10 bg-white p-4 shadow-card transition-colors hover:border-brand/40"
            >
              <div>
                <p className="font-black leading-none text-ink">{empresa.nome}</p>
                <p className="mt-1 text-xs text-ink/60">{empresa.cnpj ?? 'Sem CNPJ'}</p>
              </div>
              <Badge tom="destaque">{SEGMENTO_LABEL[empresa.segmento]}</Badge>
            </Link>
          ))}
        </div>
      )}

      <EmpresaFormModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => {
          setModalAberto(false);
          carregar(busca);
        }}
      />
    </div>
  );
}
