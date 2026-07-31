'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { temPermissao } from '../../lib/auth';
import {
  Consultor,
  EmpresaCliente,
  ResultadoPaginado,
  StatusVisita,
  Visita,
} from '../../types';
import { STATUS_VISITA_LABEL } from '../../lib/formato';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

const STATUS = Object.keys(STATUS_VISITA_LABEL) as StatusVisita[];

// Converte um Date para o valor de <input type="datetime-local"> (sem 'Z',
// no fuso local do navegador — que aqui é America/Sao_Paulo).
function paraInputLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const ajustado = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return ajustado.toISOString().slice(0, 16);
}

interface VisitaFormModalProps {
  aberto: boolean;
  visita?: Visita | null;
  // Pré-preenche início/fim quando o usuário clica num dia/hora vazio.
  inicioSugerido?: string;
  onFechar: () => void;
  onMudou: () => void;
}

export function VisitaFormModal({
  aberto,
  visita,
  inicioSugerido,
  onFechar,
  onMudou,
}: VisitaFormModalProps) {
  const editando = Boolean(visita);
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const podeEditar = temPermissao('VISITAS_WRITE');

  useEffect(() => {
    if (!aberto) return;
    api
      .get<ResultadoPaginado<EmpresaCliente>>('/empresas?limit=100')
      .then((r) => setEmpresas(r.data))
      .catch(() => setEmpresas([]));
    api
      .get<ResultadoPaginado<Consultor>>('/consultores?limit=100')
      .then((r) => setConsultores(r.data))
      .catch(() => setConsultores([]));
  }, [aberto]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const inicio = new Date(String(form.get('inicio'))).toISOString();
    const fim = new Date(String(form.get('fim'))).toISOString();

    const corpo = {
      empresaId: String(form.get('empresaId')),
      consultorId: String(form.get('consultorId')),
      inicio,
      fim,
      tipoServico: String(form.get('tipoServico')),
      status: String(form.get('status')) as StatusVisita,
      observacoes: String(form.get('observacoes')) || undefined,
    };

    setSalvando(true);
    setErro(null);
    try {
      if (visita) {
        await api.patch(`/visitas/${visita.id}`, corpo);
      } else {
        await api.post('/visitas', corpo);
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a visita');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!visita) return;
    setSalvando(true);
    try {
      await api.del(`/visitas/${visita.id}`);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar visita' : 'Nova visita'} onFechar={onFechar}>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <Select id="empresaId" name="empresaId" label="Local (empresa)" defaultValue={visita?.empresaId ?? ''} required>
          <option value="" disabled>
            Selecione a empresa
          </option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>

        <Select id="consultorId" name="consultorId" label="Consultor" defaultValue={visita?.consultorId ?? ''} required>
          <option value="" disabled>
            Selecione o consultor
          </option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="inicio"
            name="inicio"
            label="Início"
            type="datetime-local"
            defaultValue={paraInputLocal(visita?.inicio ?? inicioSugerido)}
            required
          />
          <Input
            id="fim"
            name="fim"
            label="Fim"
            type="datetime-local"
            defaultValue={paraInputLocal(visita?.fim)}
            required
          />
        </div>

        <Input
          id="tipoServico"
          name="tipoServico"
          label="Tipo de serviço"
          defaultValue={visita?.tipoServico ?? ''}
          placeholder="Ex: Auditoria, Treinamento, Diagnóstico"
          required
        />

        <Select id="status" name="status" label="Status" defaultValue={visita?.status ?? 'AGENDADA'}>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_VISITA_LABEL[s]}
            </option>
          ))}
        </Select>

        <Input id="observacoes" name="observacoes" label="Observações" defaultValue={visita?.observacoes ?? ''} />

        {erro && <p className="text-xs text-accent">{erro}</p>}

        <div className="mt-2 flex items-center justify-between">
          {editando && podeEditar ? (
            <Button type="button" variante="danger" onClick={excluir} disabled={salvando}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variante="ghost" onClick={onFechar}>
              Cancelar
            </Button>
            {podeEditar && (
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
