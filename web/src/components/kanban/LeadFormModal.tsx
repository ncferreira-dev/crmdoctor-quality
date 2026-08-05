'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { EstagioLead, Lead, Segmento } from '../../types';
import { SEGMENTO_LABEL } from '../../lib/formato';
import {
  ErrosForm,
  focarPrimeiroErro,
  temErro,
  validarObrigatorios,
} from '../../lib/formulario';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

const SEGMENTOS = Object.keys(SEGMENTO_LABEL) as Segmento[];

interface LeadFormModalProps {
  aberto: boolean;
  lead?: Lead | null;
  // Estágio da coluna onde o usuário clicou em "+", pra já nascer no lugar certo.
  estagioInicial?: EstagioLead;
  onFechar: () => void;
  onMudou: () => void;
}

export function LeadFormModal({
  aberto,
  lead,
  estagioInicial,
  onFechar,
  onMudou,
}: LeadFormModalProps) {
  const editando = Boolean(lead);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const problemas = validarObrigatorios(form, { nome: 'Informe o nome do contato.' });
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});
    const segmento = String(form.get('segmento'));

    const corpo = {
      nome: String(form.get('nome')),
      empresaNome: String(form.get('empresaNome')) || undefined,
      email: String(form.get('email')) || undefined,
      telefone: String(form.get('telefone')) || undefined,
      segmento: segmento ? (segmento as Segmento) : undefined,
      origem: String(form.get('origem')) || undefined,
      observacoes: String(form.get('observacoes')) || undefined,
    };

    setSalvando(true);
    setErro(null);
    try {
      if (lead) {
        await api.patch(`/leads/${lead.id}`, corpo);
      } else {
        // O estágio não vai no create (o backend usa o default NOVO); se o
        // usuário abriu pelo "+" de outra coluna, movemos logo em seguida.
        const criado = await api.post<Lead>('/leads', corpo);
        if (estagioInicial && estagioInicial !== 'NOVO') {
          await api.patch(`/leads/${criado.id}/estagio`, { estagio: estagioInicial });
        }
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o lead');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!lead) return;
    setSalvando(true);
    try {
      await api.del(`/leads/${lead.id}`);
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar lead' : 'Novo lead'} onFechar={onFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <Input
          id="nome"
          name="nome"
          label="Nome do contato"
          defaultValue={lead?.nome ?? ''}
          erro={erros.nome}
          autoFocus
        />
        <Input
          id="empresaNome"
          name="empresaNome"
          label="Empresa"
          defaultValue={lead?.empresaNome ?? ''}
          placeholder="Nome da clínica ou laboratório"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input id="email" name="email" label="E-mail" type="email" defaultValue={lead?.email ?? ''} />
          <Input id="telefone" name="telefone" label="Telefone" defaultValue={lead?.telefone ?? ''} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select id="segmento" name="segmento" label="Segmento" defaultValue={lead?.segmento ?? ''}>
            <option value="">Não informado</option>
            {SEGMENTOS.map((s) => (
              <option key={s} value={s}>
                {SEGMENTO_LABEL[s]}
              </option>
            ))}
          </Select>
          <Input
            id="origem"
            name="origem"
            label="Origem"
            defaultValue={lead?.origem ?? ''}
            placeholder="Indicação, site..."
          />
        </div>

        <Input id="observacoes" name="observacoes" label="Observações" defaultValue={lead?.observacoes ?? ''} />

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
