'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { usePermissao } from '../../hooks/useSessao';
import { EtapaProjeto, StatusEtapa } from '../../types';
import { STATUS_ETAPA_LABEL } from '../../lib/formato';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { CampoData } from '../ui/CampoData';
import { Modal } from '../ui/Modal';
import { SeloPrazo } from './SeloPrazo';

const STATUS = Object.keys(STATUS_ETAPA_LABEL) as StatusEtapa[];

interface EtapasSectionProps {
  projetoId: string;
  etapas: EtapaProjeto[];
  onMudou: () => void;
}

export function EtapasSection({ projetoId, etapas, onMudou }: EtapasSectionProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const podeEditar = usePermissao('PROJETOS_WRITE');

  const concluidas = etapas.filter((e) => e.status === 'CONCLUIDA').length;
  const progresso = etapas.length === 0 ? 0 : Math.round((concluidas / etapas.length) * 100);

  async function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const prazo = String(form.get('prazo'));

    setSalvando(true);
    setErro(null);
    try {
      await api.post(`/projetos/${projetoId}/etapas`, {
        nome: String(form.get('nome')),
        // Próxima ordem livre: etapas são uma sequência, não um conjunto.
        ordem: etapas.length + 1,
        prazo: prazo ? `${prazo}T12:00:00.000Z` : undefined,
      });
      setModalAberto(false);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a etapa');
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(etapa: EtapaProjeto, status: StatusEtapa) {
    setErro(null);
    try {
      await api.patch(`/etapas/${etapa.id}`, { status });
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar o status');
    }
  }

  async function excluir(etapa: EtapaProjeto) {
    setErro(null);
    try {
      await api.del(`/etapas/${etapa.id}`);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a etapa');
    }
  }

  return (
    <div className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-light uppercase tracking-wide text-ink/60">
            Marcos de compliance
          </span>
          {etapas.length > 0 && (
            <p className="dado mt-1 text-xs text-ink/50">
              {concluidas} de {etapas.length} concluídos · {progresso}%
            </p>
          )}
        </div>
        {podeEditar && (
          <Button variante="secondary" onClick={() => setModalAberto(true)}>
            Novo marco
          </Button>
        )}
      </div>

      {/* Barra de progresso: leitura imediata de quanto do projeto já fechou. */}
      {etapas.length > 0 && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      )}

      {erro && (
        <p role="alert" className="mb-2 text-xs text-accent">
          {erro}
        </p>
      )}

      {etapas.length === 0 ? (
        <p className="text-xs text-ink/40">
          Nenhum marco definido. Marcos com prazo entram no alerta automático de compliance.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {etapas.map((etapa) => (
            <li
              key={etapa.id}
              className="flex items-center justify-between gap-3 rounded-md border border-ink/10 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="dado shrink-0 text-xs text-ink/35">
                  {String(etapa.ordem).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm ${
                      etapa.status === 'CONCLUIDA'
                        ? 'text-ink/40 line-through'
                        : 'font-medium text-ink'
                    }`}
                  >
                    {etapa.nome}
                  </p>
                  {/* Prazo vencido de etapa concluída não é problema: só mostra
                      o selo de urgência no que ainda está aberto. */}
                  {etapa.status !== 'CONCLUIDA' && etapa.prazo && (
                    <div className="mt-1">
                      <SeloPrazo prazo={etapa.prazo} tipo="marco" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {podeEditar ? (
                  <>
                    <Select
                      tamanho="compacto"
                      value={etapa.status}
                      onChange={(e) => mudarStatus(etapa, e.target.value as StatusEtapa)}
                      aria-label={`Status de ${etapa.nome}`}
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_ETAPA_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => excluir(etapa)}
                      aria-label={`Excluir ${etapa.nome}`}
                      className="rounded p-1 text-ink/30 transition-colors hover:bg-surface hover:text-accent"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-ink/50">{STATUS_ETAPA_LABEL[etapa.status]}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <Modal aberto={modalAberto} titulo="Novo marco" onFechar={() => setModalAberto(false)}>
        <form onSubmit={criar} className="flex flex-col gap-3">
          <Input
            id="nome"
            name="nome"
            label="Nome do marco"
            placeholder="Ex: Entrega do dossiê técnico"
            required
            autoFocus
          />
          <CampoData id="prazo" name="prazo" label="Prazo" />
          <p className="text-[11px] text-ink/45">
            Marcos com prazo entram no alerta automático quando faltarem 15 dias.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variante="ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
