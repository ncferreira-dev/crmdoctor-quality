'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { EmpresaCliente, Projeto, ResultadoPaginado } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface ProjetoFormModalProps {
  aberto: boolean;
  projeto?: Projeto | null;
  // Quando aberto de dentro de uma empresa, a empresa já vem travada.
  empresaFixaId?: string;
  onFechar: () => void;
  onMudou: () => void;
}

// <input type="date"> espera YYYY-MM-DD; a API devolve ISO completo.
function paraInputData(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function ProjetoFormModal({
  aberto,
  projeto,
  empresaFixaId,
  onFechar,
  onMudou,
}: ProjetoFormModalProps) {
  const editando = Boolean(projeto);
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || empresaFixaId) return;
    api
      .get<ResultadoPaginado<EmpresaCliente>>('/empresas?limit=100')
      .then((r) => setEmpresas(r.data))
      .catch(() => setEmpresas([]));
  }, [aberto, empresaFixaId]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const valorBruto = String(form.get('valor'));
    const dataLimite = String(form.get('dataLimiteCompliance'));

    const corpo = {
      titulo: String(form.get('titulo')),
      descricao: String(form.get('descricao')) || undefined,
      // A API espera ISO 8601; o input dá só a data, então fixamos meio-dia UTC
      // para a data não "voltar um dia" ao ser convertida no fuso local.
      dataLimiteCompliance: dataLimite ? `${dataLimite}T12:00:00.000Z` : undefined,
      valor: valorBruto ? Number(valorBruto) : undefined,
      ...(editando ? {} : { empresaId: empresaFixaId ?? String(form.get('empresaId')) }),
    };

    setSalvando(true);
    setErro(null);
    try {
      if (projeto) {
        await api.patch(`/projetos/${projeto.id}`, corpo);
      } else {
        await api.post('/projetos', corpo);
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o projeto');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!projeto) return;
    setSalvando(true);
    try {
      await api.del(`/projetos/${projeto.id}`);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar projeto' : 'Novo projeto'} onFechar={onFechar}>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <Input
          id="titulo"
          name="titulo"
          label="Título"
          defaultValue={projeto?.titulo ?? ''}
          placeholder="Ex: Auditoria RDC 430"
          required
          autoFocus
        />

        {!editando && !empresaFixaId && (
          <Select id="empresaId" name="empresaId" label="Empresa" defaultValue="" required>
            <option value="" disabled>
              Selecione a empresa
            </option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Select>
        )}

        <Input id="descricao" name="descricao" label="Descrição" defaultValue={projeto?.descricao ?? ''} />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="dataLimiteCompliance"
            name="dataLimiteCompliance"
            label="Prazo de compliance"
            type="date"
            defaultValue={paraInputData(projeto?.dataLimiteCompliance)}
          />
          <Input
            id="valor"
            name="valor"
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={projeto?.valor ?? ''}
          />
        </div>

        <p className="text-[11px] text-ink/45">
          O prazo alimenta o alerta automático de compliance, disparado quando faltarem 15 dias.
        </p>

        {erro && (
          <p role="alert" className="text-xs text-accent">
            {erro}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          {editando ? (
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
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
