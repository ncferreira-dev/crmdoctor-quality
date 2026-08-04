'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { Competencia } from '../../types';
import {
  ErrosForm,
  focarPrimeiroErro,
  temErro,
  validarObrigatorios,
} from '../../lib/formulario';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CompetenciaFormModalProps {
  aberto: boolean;
  competencia?: Competencia | null;
  onFechar: () => void;
  onMudou: () => void;
}

export function CompetenciaFormModal({
  aberto,
  competencia,
  onFechar,
  onMudou,
}: CompetenciaFormModalProps) {
  const editando = Boolean(competencia);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const problemas = validarObrigatorios(form, { nome: 'Informe o nome da competência.' });
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});

    const corpo = {
      nome: String(form.get('nome')),
      descricao: String(form.get('descricao')) || undefined,
    };

    setSalvando(true);
    setErro(null);
    try {
      if (competencia) {
        await api.patch(`/competencias/${competencia.id}`, corpo);
      } else {
        await api.post('/competencias', corpo);
      }
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a competência');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={editando ? 'Editar competência' : 'Nova competência'}
      onFechar={onFechar}
    >
      <form
        key={competencia?.id ?? 'nova'}
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-3"
      >
        <Input
          id="nome"
          name="nome"
          label="Nome"
          defaultValue={competencia?.nome ?? ''}
          placeholder="Ex: Auditoria de BPF"
          erro={erros.nome}
          autoFocus
        />
        <Input
          id="descricao"
          name="descricao"
          label="Descrição"
          defaultValue={competencia?.descricao ?? ''}
        />

        {erro && (
          <p role="alert" className="text-xs text-accent">
            {erro}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variante="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar competência'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
